#!/usr/bin/env node
import { execSync } from 'child_process';

try {
  execSync('gitleaks version', { stdio: 'ignore' });
} catch {
  console.error(
    '[secrets:scan] Gitleaks CLI not found. Install: https://github.com/gitleaks/gitleaks#installing\n' +
      '  (macOS: brew install gitleaks   Windows: scoop install gitleaks   or download a release binary)\n' +
      'CI runs the same scan via .github/workflows/secrets.yml.'
  );
  process.exit(1);
}

execSync(
  'gitleaks detect --source . --config .gitleaks.toml --verbose --redact',
  { stdio: 'inherit' }
);
