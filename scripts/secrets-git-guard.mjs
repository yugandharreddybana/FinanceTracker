#!/usr/bin/env node
/**
 * Blocks commits when env/credential filenames are staged (including `git add -f`).
 * Safe files: .env.example, .env.sample, .env.template
 */
import { execSync } from 'child_process';
import path from 'path';

const ALLOWED_DOTENV = /^\.env\.(example|sample|template)$/i;

function forbidReason(rel) {
  const norm = rel.replace(/\\/g, '/');
  const base = path.basename(norm);
  if (base === '.env') return 'Root `.env` must never be committed. Use `.env.example` + Railway/Vercel secrets.';
  if (base.startsWith('.env.') && !ALLOWED_DOTENV.test(base)) {
    return `Env file \`${base}\` must never be committed (use platform env vars).`;
  }
  if (/^\.env\.local$/i.test(base)) return '`.env.local` must not be committed.';
  return null;
}

function main() {
  let staged;
  try {
    staged = execSync(
      'git diff --cached --name-only --diff-filter=ACM',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();
  } catch {
    console.error('[secrets-git-guard] Run from repo with git.');
    process.exit(0);
  }
  if (!staged) process.exit(0);

  const bad = [];
  for (const line of staged.split('\n')) {
    if (!line) continue;
    const reason = forbidReason(line.trim());
    if (reason) bad.push(`${line.trim()}: ${reason}`);
  }

  if (bad.length) {
    console.error('\n✖ Secrets guard: refusing commit\n');
    for (const msg of bad) console.error(`  • ${msg}`);
    console.error('\nRestore: git restore --staged <file> && keep secrets only in localhost / hosting env vars.\n');
    process.exit(1);
  }
}

main();
