/**
 * keyManager.ts
 *
 * Manages the server-side RSA-PSS key pair used for RS256 JWT signing:
 *   - Private key: 4096-bit RSA-PSS, AES-256-GCM encrypted at rest
 *   - Public key:  PEM (SPKI), written plaintext so clients can fetch it
 *
 * Also manages per-user ECDSA P-256 keypairs for per-operation request signing.
 *
 * Analogous to the blockchain model:
 *   Server keypair  ≈ Certificate Authority (CA)
 *     - Signs access tokens (JWTs) that prove identity
 *     - Public key published at /api/auth/public-key
 *   User keypair    ≈ Wallet keypair
 *     - User signs every mutating request payload with their private key
 *     - Server verifies signature against stored public key before processing
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const KEY_DIR = path.join(process.cwd(), "data", "keys");
const SERVER_PRIVATE_KEY_FILE = path.join(KEY_DIR, "server_private.pem.enc");
const SERVER_PUBLIC_KEY_FILE = path.join(KEY_DIR, "server_public.pem");

// AES-256-GCM key to encrypt the private key at rest.
// Must be 32 bytes of hex (64 hex chars). Loaded from KEY_ENCRYPTION_SECRET env.
function getKeyEncryptionSecret(): Buffer {
  const raw = process.env.KEY_ENCRYPTION_SECRET;
  if (!raw || raw.length < 64) {
    throw new Error(
      "KEY_ENCRYPTION_SECRET must be at least 64 hex characters (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(raw.slice(0, 64), "hex");
}

function ensureKeyDir() {
  if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
}

function encryptPem(pem: string, encKey: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const encrypted = Buffer.concat([cipher.update(pem, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv(hex):authTag(hex):ciphertext(hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptPem(stored: string, encKey: Buffer): string {
  const [ivHex, tagHex, ctHex] = stored.split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("Corrupt encrypted key file");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ct).toString("utf8") + decipher.final("utf8");
}

let _serverPrivateKey: crypto.KeyObject | null = null;
let _serverPublicKey: crypto.KeyObject | null = null;

/**
 * Returns the server RSA-PSS key pair, generating and persisting them if they
 * do not yet exist.  Calling this multiple times is safe — keys are cached.
 */
export function getServerKeyPair(): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject } {
  if (_serverPrivateKey && _serverPublicKey) {
    return { privateKey: _serverPrivateKey, publicKey: _serverPublicKey };
  }

  ensureKeyDir();
  const encKey = getKeyEncryptionSecret();

  if (fs.existsSync(SERVER_PRIVATE_KEY_FILE) && fs.existsSync(SERVER_PUBLIC_KEY_FILE)) {
    // Load existing keys
    const encPem = fs.readFileSync(SERVER_PRIVATE_KEY_FILE, "utf-8").trim();
    const privPem = decryptPem(encPem, encKey);
    const pubPem = fs.readFileSync(SERVER_PUBLIC_KEY_FILE, "utf-8").trim();

    _serverPrivateKey = crypto.createPrivateKey({ key: privPem, format: "pem" });
    _serverPublicKey = crypto.createPublicKey({ key: pubPem, format: "pem" });
  } else {
    // Generate a new 4096-bit RSA-PSS key pair
    console.log("[keyManager] Generating new 4096-bit RSA-PSS server key pair — this may take a moment…");
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 4096,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    // Persist: private key AES-256-GCM encrypted, public key plaintext
    fs.writeFileSync(SERVER_PRIVATE_KEY_FILE, encryptPem(privateKey as unknown as string, encKey), { mode: 0o600 });
    fs.writeFileSync(SERVER_PUBLIC_KEY_FILE, publicKey as unknown as string, { mode: 0o644 });
    console.log("[keyManager] Key pair generated and persisted.");

    _serverPrivateKey = crypto.createPrivateKey({ key: privateKey as unknown as string, format: "pem" });
    _serverPublicKey = crypto.createPublicKey({ key: publicKey as unknown as string, format: "pem" });
  }

  return { privateKey: _serverPrivateKey!, publicKey: _serverPublicKey! };
}

/** Returns the server public key in PEM (SPKI) format for distribution to clients. */
export function getServerPublicKeyPem(): string {
  const { publicKey } = getServerKeyPair();
  return publicKey.export({ type: "spki", format: "pem" }) as string;
}

/**
 * Forces a key rotation: deletes persisted key files and clears the in-memory
 * cache so the next call to getServerKeyPair() generates a fresh pair.
 * WARNING: all existing JWTs will immediately become invalid.
 */
export function rotateServerKeys(): void {
  if (fs.existsSync(SERVER_PRIVATE_KEY_FILE)) fs.unlinkSync(SERVER_PRIVATE_KEY_FILE);
  if (fs.existsSync(SERVER_PUBLIC_KEY_FILE)) fs.unlinkSync(SERVER_PUBLIC_KEY_FILE);
  _serverPrivateKey = null;
  _serverPublicKey = null;
  console.log("[keyManager] Server keys rotated. All existing tokens are now invalid.");
  getServerKeyPair(); // Eagerly generate new pair
}

// ---------------------------------------------------------------------------
// User ECDSA P-256 keypair utilities
// ---------------------------------------------------------------------------

export interface UserKeyPair {
  publicKey: string;  // PEM SPKI — stored in user record
  privateKey: string; // PEM PKCS8 — returned to client once, never stored server-side
}

/**
 * Generates an ECDSA P-256 keypair for a newly registered user.
 * The private key is returned to the client exactly once and never persisted
 * on the server — analogous to a blockchain wallet's private key.
 */
export function generateUserKeyPair(): UserKeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey: publicKey as unknown as string, privateKey: privateKey as unknown as string };
}

/**
 * Signs a request payload with the user's ECDSA P-256 private key.
 * Used server-side only in tests; in production the client holds the private key.
 *
 * @param payload   The canonical string representation of the request body
 * @param privateKeyPem  PKCS8 PEM private key
 * @returns DER-encoded signature as a base64url string
 */
export function signRequestPayload(payload: string, privateKeyPem: string): string {
  const privKey = crypto.createPrivateKey({ key: privateKeyPem, format: "pem" });
  return crypto.sign("SHA256", Buffer.from(payload, "utf8"), {
    key: privKey,
    dsaEncoding: "der",
  }).toString("base64url");
}

/**
 * Verifies a request payload signature against the user's stored public key.
 *
 * @param payload   The canonical string representation of the request body
 * @param signature  DER-encoded signature as a base64url string
 * @param publicKeyPem  SPKI PEM public key stored in the user record
 */
export function verifyRequestSignature(payload: string, signature: string, publicKeyPem: string): boolean {
  try {
    const pubKey = crypto.createPublicKey({ key: publicKeyPem, format: "pem" });
    return crypto.verify("SHA256", Buffer.from(payload, "utf8"), {
      key: pubKey,
      dsaEncoding: "der",
    }, Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
}
