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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("JWT_SECRET missing from process.env! Auth will fail.");
} else if (JWT_SECRET.length < 32) {
  console.warn("[SECURITY] JWT_SECRET is too short (< 32 characters). Use at least 64 random hex characters in production.");
}
const USERS_FILE = path.join(process.cwd(), "data", "users.json");

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
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await saveUsers(users);
  const token = createToken({ uid, email, name });
  return { user: { uid, email, name }, token };
}

export function loginUser(email: string, password: string): { user: { uid: string; email: string; name: string }; token: string } {
  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) {
    throw new Error("Invalid email or password");
  }
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error("Invalid email or password");
  }
  const token = createToken({ uid: user.uid, email: user.email, name: user.name });
  return { user: { uid: user.uid, email: user.email, name: user.name }, token };
}

export async function changeUserPassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) throw new Error("User not found");
  const user = users[idx];
  const currentHash = hashPassword(currentPassword, user.salt);
  if (!crypto.timingSafeEqual(Buffer.from(currentHash), Buffer.from(user.passwordHash))) {
    throw new Error("Current password is incorrect");
  }
  const newSalt = crypto.randomBytes(32).toString("hex");
  users[idx] = { ...user, salt: newSalt, passwordHash: hashPassword(newPassword, newSalt) };
  await saveUsers(users);
}

export async function resetUserPassword(email: string, newPassword: string): Promise<void> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) throw new Error("User not found");
  const newSalt = crypto.randomBytes(32).toString("hex");
  users[idx] = { ...users[idx], salt: newSalt, passwordHash: hashPassword(newPassword, newSalt) };
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

// In-memory store for reset tokens (Token -> {email, expiry})
const resetTokens = new Map<string, { email: string; expiry: number }>();

export function generateResetToken(email: string): string {
  const user = findUserByEmail(email);
  if (!user) throw new Error("User not found");

  const token = crypto.randomUUID();
  const expiry = Date.now() + 3600000; // 1 hour
  resetTokens.set(token, { email, expiry });

  return token;
}

export function resetPasswordWithToken(token: string, newPassword: string): void {
  const resetInfo = resetTokens.get(token);
  if (!resetInfo) throw new Error("Invalid or expired reset token");

  if (Date.now() > resetInfo.expiry) {
    resetTokens.delete(token);
    throw new Error("Reset token has expired");
  }

  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === resetInfo.email);
  if (idx === -1) throw new Error("User no longer exists");

  const newSalt = crypto.randomBytes(32).toString("hex");
  users[idx] = {
    ...users[idx],
    salt: newSalt,
    passwordHash: hashPassword(newPassword, newSalt)
  };

  saveUsers(users);
  resetTokens.delete(token); // Cleanup
}

export function updatePasswordDirectly(email: string, newPassword: string): void {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) throw new Error("User not found");

  const newSalt = crypto.randomBytes(32).toString("hex");
  users[idx] = {
    ...users[idx],
    salt: newSalt,
    passwordHash: hashPassword(newPassword, newSalt)
  };

  saveUsers(users);
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
