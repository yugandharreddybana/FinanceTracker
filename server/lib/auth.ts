import dotenv from "dotenv";
import crypto from "node:crypto";
import fs from "fs";
import path from "path";
dotenv.config();

// Ensure JWT_SECRET is available even if started from server subdirectory
if (!process.env.JWT_SECRET) {
  const rootEnv = path.join(process.cwd(), "..", ".env");
  const localEnv = path.join(process.cwd(), ".env");
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("JWT_SECRET missing from process.env! Auth will fail.");
}
const USERS_FILE = path.join(process.cwd(), "data", "users.json");

export interface StoredUser {
  uid: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// PostgreSQL dual-mode storage — uses pg if DATABASE_URL is set, JSON fallback otherwise
// ---------------------------------------------------------------------------

let pgPool: import("pg").Pool | null = null;
let pgReady = false;

export async function getPgPool(): Promise<import("pg").Pool | null> {
  if (pgReady) return pgPool;
  return null;
}

async function initPg(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[auth] DATABASE_URL not set — user data stored in local JSON file (NOT suitable for production)");
    pgReady = true;
    return;
  }

  try {
    // Dynamically import pg to avoid hard-fail if not installed
    const { default: pg } = await import("pg") as any;
    const Pool = pg.Pool;
    const isLocalhost = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    });

    await pool.query(
      `CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    );

    pgPool = pool;
    pgReady = true;
    console.log("[auth] PostgreSQL connected — using persistent user storage");
  } catch (err: any) {
    console.warn("[auth] PostgreSQL connection failed — falling back to JSON file storage:", err.message);
    pgPool = null;
    pgReady = true;
  }
}

// Initialise PostgreSQL on module load
initPg().catch((err) => {
  console.error("[auth] Unexpected error during pg init:", err);
  pgReady = true;
});

// ---------------------------------------------------------------------------
// DB query helpers
// ---------------------------------------------------------------------------

async function dbFindByEmail(email: string): Promise<StoredUser | undefined> {
  if (!pgPool) return undefined;
  const result = await pgPool.query(
    "SELECT uid, email, name, password_hash, salt, created_at FROM users WHERE email = $1",
    [email]
  );
  if (result.rows.length === 0) return undefined;
  const row = result.rows[0];
  return { uid: row.uid, email: row.email, name: row.name, passwordHash: row.password_hash, salt: row.salt, createdAt: row.created_at };
}

async function dbInsertUser(user: StoredUser): Promise<void> {
  if (!pgPool) return;
  await pgPool.query(
    "INSERT INTO users (uid, email, name, password_hash, salt, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [user.uid, user.email, user.name, user.passwordHash, user.salt, user.createdAt]
  );
}

async function dbUpdatePassword(email: string, hash: string, salt: string): Promise<void> {
  if (!pgPool) return;
  await pgPool.query(
    "UPDATE users SET password_hash=$1, salt=$2 WHERE email=$3",
    [hash, salt, email]
  );
}

async function dbDeleteByEmail(email: string): Promise<boolean> {
  if (!pgPool) return false;
  const result = await pgPool.query("DELETE FROM users WHERE email = $1", [email]);
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// JSON file fallback — in-memory user cache + async write queue
// ---------------------------------------------------------------------------

let userCache: StoredUser[] = [];
let isSaving = false;
const writeQueue: Array<{ data: string; resolve: () => void; reject: (e: Error) => void }> = [];

function processWriteQueue() {
  if (writeQueue.length === 0) {
    isSaving = false;
    return;
  }
  isSaving = true;
  const { data, resolve, reject } = writeQueue.shift()!;
  ensureDataDir();
  fs.writeFile(USERS_FILE, data, "utf-8", (err) => {
    if (err) {
      console.error("[auth] Failed to persist users:", err);
      reject(err);
    } else {
      resolve();
    }
    processWriteQueue();
  });
}

function ensureDataDir() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadUsers(): StoredUser[] {
  return userCache;
}

function saveUsers(users: StoredUser[]): Promise<void> {
  userCache = [...users];
  const data = JSON.stringify(users, null, 2);
  return new Promise<void>((resolve, reject) => {
    writeQueue.push({ data, resolve, reject });
    if (!isSaving) processWriteQueue();
  });
}

function initCache() {
  ensureDataDir();
  if (fs.existsSync(USERS_FILE)) {
    try {
      userCache = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    } catch {
      userCache = [];
    }
  }
}
initCache();

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

export function createToken(payload: { uid: string; email: string; name: string }): string {
  if (!JWT_SECRET) throw new Error("Internal Server Error: JWT_SECRET is not configured");

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { uid: string; email: string; name: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto.createHmac("sha256", JWT_SECRET!).update(`${header}.${body}`).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: payload.uid, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Exported auth functions — use DB when available, fall back to JSON
// ---------------------------------------------------------------------------

export async function registerUser(email: string, password: string, name: string): Promise<{ user: { uid: string; email: string; name: string }; token: string }> {
  const salt = crypto.randomBytes(32).toString("hex");
  const uid = crypto.randomUUID();
  const user: StoredUser = {
    uid,
    email,
    name,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };

  if (pgPool) {
    const existing = await dbFindByEmail(email);
    if (existing) throw new Error("An account with this email already exists");
    await dbInsertUser(user);
  } else {
    const users = loadUsers();
    if (users.find((u) => u.email === email)) throw new Error("An account with this email already exists");
    users.push(user);
    await saveUsers(users);
  }

  const token = createToken({ uid, email, name });
  return { user: { uid, email, name }, token };
}

export async function loginUser(email: string, password: string): Promise<{ user: { uid: string; email: string; name: string }; token: string }> {
  let user: StoredUser | undefined;

  if (pgPool) {
    user = await dbFindByEmail(email);
  } else {
    user = loadUsers().find((u) => u.email === email);
  }

  if (!user) throw new Error("Invalid email or password");

  const hash = hashPassword(password, user.salt);
  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash))) {
    throw new Error("Invalid email or password");
  }

  const token = createToken({ uid: user.uid, email: user.email, name: user.name });
  return { user: { uid: user.uid, email: user.email, name: user.name }, token };
}

export async function changeUserPassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  let user: StoredUser | undefined;

  if (pgPool) {
    user = await dbFindByEmail(email);
  } else {
    user = loadUsers().find((u) => u.email === email);
  }

  if (!user) throw new Error("User not found");

  const currentHash = hashPassword(currentPassword, user.salt);
  if (!crypto.timingSafeEqual(Buffer.from(currentHash), Buffer.from(user.passwordHash))) {
    throw new Error("Current password is incorrect");
  }

  const newSalt = crypto.randomBytes(32).toString("hex");
  const newHash = hashPassword(newPassword, newSalt);

  if (pgPool) {
    await dbUpdatePassword(email, newHash, newSalt);
  } else {
    const users = loadUsers();
    const idx = users.findIndex((u) => u.email === email);
    users[idx] = { ...users[idx], salt: newSalt, passwordHash: newHash };
    await saveUsers(users);
  }
}

export async function resetUserPassword(email: string, newPassword: string): Promise<void> {
  const newSalt = crypto.randomBytes(32).toString("hex");
  const newHash = hashPassword(newPassword, newSalt);

  if (pgPool) {
    const user = await dbFindByEmail(email);
    if (!user) throw new Error("User not found");
    await dbUpdatePassword(email, newHash, newSalt);
  } else {
    const users = loadUsers();
    const idx = users.findIndex((u) => u.email === email);
    if (idx === -1) throw new Error("User not found");
    users[idx] = { ...users[idx], salt: newSalt, passwordHash: newHash };
    await saveUsers(users);
  }
}

export async function deleteUserByEmail(email: string): Promise<boolean> {
  if (pgPool) {
    return dbDeleteByEmail(email);
  }
  const users = loadUsers();
  const next = users.filter((u) => u.email !== email);
  if (next.length === users.length) return false;
  await saveUsers(next);
  return true;
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  if (pgPool) {
    return dbFindByEmail(email);
  }
  return loadUsers().find((u) => u.email === email);
}
