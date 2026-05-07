import dotenv from "dotenv";
import crypto from "crypto";
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

// Hard fail at module load — never run with a missing or weak secret. Any code that
// imports this module assumes a verified JWT_SECRET, so deferring the check causes
// silent acceptance of forged tokens if downstream paths skip the secret.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required — server cannot start without a signing secret");
}
if (JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters (use 64+ random hex bytes in production)");
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

// PBKDF2 strength — OWASP 2023 minimum for SHA-512 is 210k; we use 600k for headroom.
// Old 100k hashes are migrated lazily on next successful login.
const PBKDF2_ITERATIONS = 600_000;
const LEGACY_PBKDF2_ITERATIONS = 100_000;

export interface Authenticator {
  credentialID: string;
  credentialPublicKey: string; // base64url encoded
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports?: string[];
}

export interface StoredUser {
  uid: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  authenticators?: Authenticator[];
  hashIterations?: number; // absent → legacy 100k
  emailVerified?: boolean; // absent → legacy users treated as verified
}

// ---------------------------------------------------------------------------
// In-memory user cache — populated once from disk on module load
// ---------------------------------------------------------------------------
let userCache: StoredUser[] = [];

// Async write queue — prevents concurrent file writes from corrupting the store
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
  // Update in-memory cache immediately so subsequent reads are consistent
  userCache = [...users];
  const data = JSON.stringify(users, null, 2);
  return new Promise<void>((resolve, reject) => {
    writeQueue.push({ data, resolve, reject });
    if (!isSaving) processWriteQueue();
  });
}

// Initialise cache from disk on module load (runs once at startup)
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

function hashPassword(password: string, salt: string, iterations: number = PBKDF2_ITERATIONS): string {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
}

function safeHashEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createToken(payload: { uid: string; email: string; name: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + 86400 })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET!).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { uid: string; email: string; name: string } | null {
  if (!JWT_SECRET) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (typeof payload.iat !== "number" || payload.iat > now + 60) return null;
    if (typeof payload.uid !== "string" || payload.uid.length === 0) return null;
    if (typeof payload.email !== "string" || payload.email.length === 0) return null;
    if (typeof payload.name !== "string") return null;

    return { uid: payload.uid, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export async function registerUser(email: string, password: string, name: string): Promise<{ user: { uid: string; email: string; name: string }; token: string }> {
  const users = loadUsers();
  if (users.find((u) => u.email === email)) {
    throw new Error("An account with this email already exists");
  }
  const salt = crypto.randomBytes(32).toString("hex");
  const uid = crypto.randomUUID();
  const user: StoredUser = {
    uid,
    email,
    name,
    passwordHash: hashPassword(password, salt, PBKDF2_ITERATIONS),
    salt,
    createdAt: new Date().toISOString(),
    hashIterations: PBKDF2_ITERATIONS,
    emailVerified: false,
  };
  users.push(user);
  await saveUsers(users);
  const token = createToken({ uid, email, name });
  return { user: { uid, email, name }, token };
}

export async function loginUser(email: string, password: string): Promise<{ user: { uid: string; email: string; name: string }; token: string }> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) {
    // Spend the same CPU on a dummy hash to avoid timing oracle on user existence
    hashPassword(password, "dummy-salt-for-timing-equalisation", PBKDF2_ITERATIONS);
    throw new Error("Invalid email or password");
  }
  const user = users[idx];
  const iterations = user.hashIterations ?? LEGACY_PBKDF2_ITERATIONS;
  const hash = hashPassword(password, user.salt, iterations);
  if (!safeHashEqual(hash, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  // Lazy rehash: legacy hashes upgraded to current iteration count on successful login
  if (iterations < PBKDF2_ITERATIONS) {
    const newSalt = crypto.randomBytes(32).toString("hex");
    users[idx] = {
      ...user,
      salt: newSalt,
      passwordHash: hashPassword(password, newSalt, PBKDF2_ITERATIONS),
      hashIterations: PBKDF2_ITERATIONS,
    };
    await saveUsers(users);
  }
  const token = createToken({ uid: user.uid, email: user.email, name: user.name });
  return { user: { uid: user.uid, email: user.email, name: user.name }, token };
}

export async function changeUserPassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) throw new Error("User not found");
  const user = users[idx];
  const iterations = user.hashIterations ?? LEGACY_PBKDF2_ITERATIONS;
  const currentHash = hashPassword(currentPassword, user.salt, iterations);
  if (!safeHashEqual(currentHash, user.passwordHash)) {
    throw new Error("Current password is incorrect");
  }
  const newSalt = crypto.randomBytes(32).toString("hex");
  users[idx] = {
    ...user,
    salt: newSalt,
    passwordHash: hashPassword(newPassword, newSalt, PBKDF2_ITERATIONS),
    hashIterations: PBKDF2_ITERATIONS,
  };
  await saveUsers(users);
}

export async function resetUserPassword(email: string, newPassword: string): Promise<void> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) throw new Error("User not found");
  const newSalt = crypto.randomBytes(32).toString("hex");
  users[idx] = {
    ...users[idx],
    salt: newSalt,
    passwordHash: hashPassword(newPassword, newSalt, PBKDF2_ITERATIONS),
    hashIterations: PBKDF2_ITERATIONS,
  };
  await saveUsers(users);
}

export async function deleteUserByEmail(email: string): Promise<boolean> {
  const users = loadUsers();
  const next = users.filter((u) => u.email !== email);
  if (next.length === users.length) return false;
  await saveUsers(next);
  return true;
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const users = loadUsers();
  return users.find((u) => u.email === email);
}

export async function markEmailVerified(email: string): Promise<boolean> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) return false;
  users[idx] = { ...users[idx], emailVerified: true };
  await saveUsers(users);
  return true;
}

export function saveUserAuthenticator(email: string, authenticator: Authenticator): void {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) throw new Error("User not found");

  if (!users[idx].authenticators) users[idx].authenticators = [];

  // Update if exists, otherwise add
  const existingIdx = users[idx].authenticators!.findIndex(a => a.credentialID === authenticator.credentialID);
  if (existingIdx !== -1) {
    users[idx].authenticators![existingIdx] = authenticator;
  } else {
    users[idx].authenticators!.push(authenticator);
  }

  saveUsers(users);
}

export function deleteUserAuthenticators(email: string): void {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) return;

  users[idx].authenticators = [];
  saveUsers(users);
}
