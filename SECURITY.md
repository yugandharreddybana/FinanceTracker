# Security policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for undisclosed security problems.  
Contact the maintainers with a private description, steps to reproduce, and impact.

## Hardening checklist (repository + GitHub)

Configure these in **GitHub → Settings → Security** (org or repo):

- **Secret scanning** — enable for the repository.
- **Push protection** — block commits that match known secret patterns (pairs with secret scanning).
- **Dependabot alerts** — enabled when `.github/dependabot.yml` is present **and** Dependency graph / Dependabot security updates are enabled in repo settings (`Settings → Code security`).
- **Branch protection** on `main`: require PR reviews; require status checks (**CI — Build & Lint**, **Security — Secret scanning** jobs); disallow force-push.
- **`GEMINI_API_KEY`**: middleware (Railway) only — never in `packages/frontend` or any `VITE_*` name. Prefer root `.env` from `.env.example` for local `server`; do not maintain parallel `.env.local` secret copies (blocked by `.gitignore` + pre-commit).

### Gitleaks on private/org repositories

The `gitleaks/gitleaks-action` may prompt for **`GITLEAKS_LICENSE`** on some GitHub Org private repos. If the workflow fails with a license error, add a [valid Gitleaks license](https://github.com/gitleaks/gitleaks-action#license) as an encrypted repository secret named `GITLEAKS_LICENSE`, or use the free tier per Gitleaks’ current policy for your org type.

## Automated checks in this repo

| Control | Purpose |
|---------|---------|
| `scripts/secrets-git-guard.mjs` + `pre-commit` | Blocks staging `.env*` (except templates) even with `git add -f`. |
| `.github/workflows/secrets.yml` | **Gitleaks** over full history; **TruffleHog** on PR commits or entire branch (`push` / weekly / manual). |
| `.github/dependabot.yml` | Weekly dependency PRs for npm, Maven (`backend/`), GitHub Actions. |
| `.gitleaks.toml` | Allowlists safe template files; extends Gitleaks default rules. |

Local scan (requires [Gitleaks CLI](https://github.com/gitleaks/gitleaks#installing)):

```bash
npm run secrets:scan
```

## If a secret was ever committed or pushed

1. **Rotate** the credential everywhere it was used (assume compromise).
2. Audit history:  
   `git log --all -- .env .env.local`  
   `git log --all -p -S 'BEGIN RSA' -S 'api_key'` (adjust for your leak).
3. Purge from history: use [git-filter-repo](https://github.com/newren/git-filter-repo) or [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/), then **force-push** and have all collaborators re-clone.

This repository cannot perform history rewriting or key rotation for you; that must be done by maintainers with git and cloud-console access.
