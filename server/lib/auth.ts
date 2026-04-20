import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import path from "path";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Try to find .env file manually if process.env is missing it
  console.warn("JWT_SECRET missing from process.env, verifying .env presence...");
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

function ensureDataDir() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadUsers(): StoredUser[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

export function createToken(payload: { uid: string; email: string; name: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET!).update(`${header}.${body}`).digest("base64url");
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

export function registerUser(email: string, password: string, name: string): { user: { uid: string; email: string; name: string }; token: string } {
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
  saveUsers(users);
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
  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash))) {
    throw new Error("Invalid email or password");
  }
  const token = createToken({ uid: user.uid, email: user.email, name: user.name });
  return { user: { uid: user.uid, email: user.email, name: user.name }, token };
}

export function changeUserPassword(email: string, currentPassword: string, newPassword: string): void {
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
  saveUsers(users);
}

export function deleteUserByEmail(email: string): boolean {
  const users = loadUsers();
  const next = users.filter((u) => u.email !== email);
  if (next.length === users.length) return false;
  saveUsers(next);
  return true;
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const users = loadUsers();
  return users.find((u) => u.email === email);
}
