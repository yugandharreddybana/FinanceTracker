#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const gitDir = path.join(root, '.git');

if (!fs.existsSync(gitDir)) {
  process.exit(0);
}

const hooksDir = path.join(gitDir, 'hooks');
const hookPath = path.join(hooksDir, 'pre-commit');

const hookScript = `#!/bin/sh
# Installed by: npm run git-hooks:install
REPO_ROOT="$(git rev-parse --show-toplevel)" || exit 0
cd "$REPO_ROOT" || exit 0
node scripts/secrets-git-guard.mjs || exit 1
`;

try {
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.writeFileSync(hookPath, hookScript.replace(/\r\n/g, '\n'), { encoding: 'utf8', flag: 'w' });
  try {
    fs.chmodSync(hookPath, 0o755);
  } catch {
    /* Windows NTFS ACLs */
  }
} catch (err) {
  console.warn('[git-hooks] Could not install pre-commit:', err?.message ?? err);
  process.exit(0);
}

console.info('[git-hooks] pre-commit → scripts/secrets-git-guard.mjs');
