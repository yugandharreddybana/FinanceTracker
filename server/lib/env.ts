import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Deterministically load environment variables in ESM modules.
 * 
 * This file MUST be imported at the very top of the entry point (`server/index.ts`)
 * before any other application files. This ensures environment variables are 
 * fully loaded into `process.env` before any downstream modules execute 
 * their top-level evaluation logic (e.g., connecting to PostgreSQL/Redis,
 * configuring rate limits, or evaluating Node profiles).
 */

function findRepoRoot(startDir: string): string {
  let current = startDir;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(current, "CLAUDE.md")) || fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break; // Hit filesystem root
    current = parent;
  }
  return startDir;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = findRepoRoot(__dirname);
const serverRoot = path.join(repoRoot, "server");

// Precedence hierarchy (first loaded retains priority since dotenv doesn't override process.env):
// 1. Process env (pre-set by OS/hosting platform)
// 2. server/.env.local (Local environment-specific developer overrides)
// 3. server/.env (Server package defaults)
// 4. repo/.env.local (Repository-wide local developer overrides)
// 5. repo/.env (Repository-wide default variables)
const envFiles = [
  path.join(serverRoot, ".env.local"),
  path.join(serverRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, ".env"),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}
