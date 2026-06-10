#!/usr/bin/env node
/**
 * Ensure each env template has at most one assignment per variable name.
 * Prevents silent "last wins" bugs (e.g. duplicate NVIDIA_API_KEY in a single .env file).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DEFAULT_FILES = ['.env.example', path.join('packages', 'frontend', '.env.example')];

function duplicateKeysInFile(absPath, relPath) {
  if (!fs.existsSync(absPath)) return [];
  const text = fs.readFileSync(absPath, 'utf8');
  const lines = text.split(/\r?\n/);
  /** @type Map<string, number[]> */
  const firstSeen = new Map();

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const unexported = line.replace(/^export\s+/i, '').trim();
    const eq = unexported.indexOf('=');
    if (eq <= 0) return;
    const key = unexported.slice(0, eq).trim();
    if (!key) return;
    if (!firstSeen.has(key)) firstSeen.set(key, []);
    firstSeen.get(key).push(idx + 1);
  });

  const dups = [];
  for (const [key, nums] of firstSeen) {
    if (nums.length > 1) dups.push({ key, lines: nums, file: relPath });
  }
  return dups;
}

function main() {
  const extra = process.argv.slice(2).map((p) => path.relative(root, path.resolve(process.cwd(), p)));
  const rels = [...new Set([...DEFAULT_FILES, ...extra])];
  /** @type {Array<{ key: string; lines: number[]; file: string }>} */
  const all = [];

  for (const rel of rels) {
    const abs = path.join(root, rel);
    all.push(...duplicateKeysInFile(abs, rel.replace(/\\/g, '/')));
  }

  if (all.length > 0) {
    console.error('\n✖ Duplicate env keys (last assignment wins — remove extras):\n');
    for (const d of all) {
      console.error(`  • ${d.file}: ${d.key} on lines ${d.lines.join(', ')}`);
    }
    console.error(
      '\nFix: keep a single NVIDIA_API_KEY (and single line per key). Railway/console env should mirror that once.'
    );
    process.exit(1);
  }

  console.log(`[env:lint] OK — unique keys in ${rels.filter((r) => fs.existsSync(path.join(root, r))).join(', ')}`);
}

main();
