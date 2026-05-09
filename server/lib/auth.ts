/**
 * auth.ts — Core authentication library
 *
 * Security model (blockchain-inspired):
 *   Server keypair (RSA-PSS 4096-bit)
 *     └─ Signs JWTs with RS256 — any party with the public key can verify identity
 *        without access to the private key (no shared-secret risk)
 *   User keypair (ECDSA P-256)
 *     └─ User signs every mutating request with their private key
 *        Server verifies against stored public key before processing
 *        Private key is issued to the client ONCE on registration — never stored server-side
 *
 * Password storage: PBKDF2-SHA-512 at 600k iterations (OWASP 2023 minimum for SHA-512 is 210k)
 * Timing safety: crypto.timingSafeEqual for all hash comparisons
 */

import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getServerKeyPair, generateUserKeyPair, UserKeyPair } from "./keyManager.js";
dotenv.config();

// Ensure env is loaded even when started from server subdirectory
if (!process.env.KEY_ENCRYPTION_SECRET) {
  const rootEnv = path.join(process.cwd(), "..", ".env");
  const localEnv = path.join(process.cwd(), ".env");
  if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
  else if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
}

// Eagerly initialise the server keypair at module load — fail fast if config is missing
getServerKeyPair();

const IS_PROD = process.env.NODE_ENV === 'production';
const ALLOW_INSECURE_FILE_AUTH_STORE = process.env.ALLOW_INSECURE_FILE_AUTH_STORE === 'true';
if (IS_PROD && !ALLOW_INSECURE_FILE_AUTH_STORE) {
  throw new Error(
    "Refusing to start with file-based auth storage in production. Configure a persistent auth store or set ALLOW_INSECURE_FILE_AUTH_STORE=true only for temporary emergency use."
  );
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

// PBKDF2 strength — OWASP 2023 minimum for SHA-512 is 210k; we use 600k for headroom.
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
  // ECDSA P-256 public key (SPKI PEM) — used to verify per-operation request signatures
  ecPublicKey?: string;
  authenticators?: Authenticator[];
  hashIterations?: number;
  emailVerified?: boolean;
}

// ---------------------------------------------------------------------------
// In-memory user cache — populated once from disk on module load
// ---------------------------------------------------------------------------
let userCache: StoredUser[] = [];

let isSaving = false;
const writeQueue: Array<{ data: string; resolve: () => void; reject: (e: Error) => void }> = [];

function processWriteQueue() {
  if (writeQueue.length === 0) { isSaving = false; return; }
  isSaving = true;
  const { data, resolve, reject } = writeQueue.shift()!;
  ensureDataDir();
  fs.writeFile(USERS_FILE, data, "utf-8", (err) => {
    if (err) { console.error("[auth] Failed to persist users:", err); reject(err); }
    else { resolve(); }
    processWriteQueue();
  });
}

function ensureDataDir() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadUsers(): StoredUser[] { return userCache; }

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
    try { userCache = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")); }
    catch { userCache = []; }
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

// ---------------------------------------------------------------------------
// RS256 JWT — signed with server RSA-PSS private key
// ---------------------------------------------------------------------------

/**
 * Issues an RS256 JWT signed with the server's RSA-PSS private key.
 * The token carries: uid, email, name, iat, exp.
 * Any party holding the server's PUBLIC key can verify authenticity without
 * access to the private key — mirrors how blockchain certificates work.
 */
export function createToken(payload: { uid: string; email: string; name: string }): string {
  const { privateKey } = getServerKeyPair();
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + 86400 })
  ).toString("base64url");
  const signingInput = `${header}.${body}`;
  // RSA-PSS with SHA-256 + MGF1-SHA-256, saltLength = 32
  const signature = crypto.sign("SHA256", Buffer.from(signingInput), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  }).toString("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies an RS256 JWT using the server's RSA public key.
 * If the signature is invalid (tampered token, wrong private key, or expired)
 * returns null — never throws, safe to call in middleware.
 */
export function verifyToken(token: string): { uid: string; email: string; name: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    // Verify algorithm claim before touching the signature
    const headerObj = JSON.parse(Buffer.from(header, "base64url").toString());
    if (headerObj.alg !== "RS256") return null;

    const { publicKey } = getServerKeyPair();
    const signingInput = `${header}.${body}`;
    const valid = crypto.verify("SHA256", Buffer.from(signingInput), {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    }, Buffer.from(signature, "base64url"));

    if (!valid) return null;

    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    if (typeof p.exp !== "number" || p.exp < now) return null;
    if (typeof p.iat !== "number" || p.iat > now + 60) return null;
    if (typeof p.uid !== "string" || p.uid.length === 0) return null;
    if (typeof p.email !== "string" || p.email.length === 0) return null;
    if (typeof p.name !== "string") return null;

    return { uid: p.uid, email: p.email, name: p.name };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// User registration / login
// ---------------------------------------------------------------------------

export interface RegisterResult {
  user: { uid: string; email: string; name: string };
  token: string;
  /**
   * ECDSA P-256 private key (PKCS8 PEM) for the user's own keypair.
   * Returned EXACTLY ONCE on registration — never stored server-side.
   * The client must store this securely (e.g., encrypted in localStorage or
   * a hardware-backed key store). It is used to sign per-operation requests.
   */
  userPrivateKey: string;
  /** SPKI PEM of the user's public key — stored server-side for signature verification. */
  userPublicKey: string;
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<RegisterResult> {
  const users = loadUsers();
  if (users.find((u) => u.email === email)) {
    throw new Error("An account with this email already exists");
  }
  const salt = crypto.randomBytes(32).toString("hex");
  const uid = crypto.randomUUID();

  // Generate user's ECDSA P-256 keypair — analogous to a blockchain wallet
  const userKeys: UserKeyPair = generateUserKeyPair();

  const user: StoredUser = {
    uid,
    email,
    name,
    passwordHash: hashPassword(password, salt, PBKDF2_ITERATIONS),
    salt,
    createdAt: new Date().toISOString(),
    hashIterations: PBKDF2_ITERATIONS,
    emailVerified: false,
    ecPublicKey: userKeys.publicKey, // stored; used for per-op signature verification
  };
  users.push(user);
  await saveUsers(users);
  const token = createToken({ uid, email, name });
  return {
    user: { uid, email, name },
    token,
    userPrivateKey: userKeys.privateKey, // issued once — not stored server-side
    userPublicKey: userKeys.publicKey,
  };
}

export interface LoginResult {
  user: { uid: string; email: string; name: string };
  token: string;
  /**
   * The user's ECDSA public key is returned on login so the client can confirm
   * it holds the corresponding private key.  The private key itself is NEVER
   * returned post-registration — the client is responsible for its custody.
   */
  userPublicKey: string;
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) {
    hashPassword(password, "dummy-salt-for-timing-equalisation", PBKDF2_ITERATIONS);
    throw new Error("Invalid email or password");
  }
  const user = users[idx];
  const iterations = user.hashIterations ?? LEGACY_PBKDF2_ITERATIONS;
  const hash = hashPassword(password, user.salt, iterations);
  if (!safeHashEqual(hash, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  // Lazy rehash: upgrade legacy hashes to current iteration count
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
  return {
    user: { uid: user.uid, email: user.email, name: user.name },
    token,
    userPublicKey: user.ecPublicKey ?? "",
  };
}

export async function changeUserPassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
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
  return loadUsers().find((u) => u.email === email);
}

export function findUserById(uid: string): StoredUser | undefined {
  return loadUsers().find((u) => u.uid === uid);
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
  const existingIdx = users[idx].authenticators!.findIndex(a => a.credentialID === authenticator.credentialID);
  if (existingIdx !== -1) users[idx].authenticators![existingIdx] = authenticator;
  else users[idx].authenticators!.push(authenticator);
  saveUsers(users);
}

export function deleteUserAuthenticators(email: string): void {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) return;
  users[idx].authenticators = [];
  saveUsers(users);
}

/**
 * Rotates the user's ECDSA keypair.
 * Returns the new private key (issued once — client must store securely).
 * Called after a compromised-key event or on explicit user request.
 */
export async function rotateUserKeyPair(uid: string): Promise<{ userPrivateKey: string; userPublicKey: string }> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.uid === uid);
  if (idx === -1) throw new Error("User not found");
  const { generateUserKeyPair: genKP } = await import("./keyManager.js");
  const newKeys = genKP();
  users[idx] = { ...users[idx], ecPublicKey: newKeys.publicKey };
  await saveUsers(users);
  return { userPrivateKey: newKeys.privateKey, userPublicKey: newKeys.publicKey };
}
