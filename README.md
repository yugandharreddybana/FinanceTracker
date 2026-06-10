# 💰 FinanceTracker

A full-stack personal finance management application with AI-powered insights, budget tracking, investment monitoring, and smart transaction processing.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Vercel         │────▶│  Railway (Node.js)   │────▶│  Railway (Java)     │
│  React Frontend │     │  Express Middleware  │     │  Spring Boot API    │
│  (Vite + TS)    │     │  Auth + AI + Proxy   │     │  PostgreSQL via     │
└─────────────────┘     └──────────────────────┘     │  Supabase           │
                                │                     └─────────────────────┘
                                │
                         ┌──────▼──────┐
                         │  Railway    │
                         │  PostgreSQL │
                         │  (users DB) │
                         └─────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Middleware | Node.js, Express, TypeScript |
| AI | NVIDIA NIM — `meta/llama-3.3-70b-instruct` |
| Backend | Java 21, Spring Boot, JPA/Hibernate |
| Database (finance data) | Supabase PostgreSQL |
| Database (user accounts) | Railway PostgreSQL |
| Stock prices | Alpha Vantage API (NSE mock data if no key) |

## Getting Started

### Prerequisites
- Node.js 20+
- Java 21+
- Maven 3.9+

### 1. Clone & Install

```bash
git clone https://github.com/yugandharreddybana/FinanceTracker
cd FinanceTracker

# Frontend
cd packages/frontend && npm install

# Node middleware
cd ../../server && npm install

# Java backend
cd ../backend && mvn install -DskipTests
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

**Never commit `.env`, `.env.local`, or backups.** After `npm install`, a Git `pre-commit` hook is installed (`scripts/secrets-git-guard.mjs`) that blocks accidental `git add -f .env*` (excluding `.env.example`). Re-install anytime with `npm run git-hooks:install`.

**CI:** [`.github/workflows/secrets.yml`](.github/workflows/secrets.yml) runs **Gitleaks** + **TruffleHog** on every PR/push to `main` and weekly on a schedule. **[Dependabot](.github/dependabot.yml)** opens weekly update PRs for npm (root, `packages/frontend`, `server`), Maven (`backend/`), and GitHub Actions.

**Locally:** Install the [Gitleaks CLI](https://github.com/gitleaks/gitleaks#installing), then run `npm run secrets:scan`.

Run `npm run env:lint` to ensure `.env.example` files do not duplicate keys (duplicate `KEY=` lines make the **last** value win and hide rotation bugs, e.g. two `NVIDIA_API_KEY` assignments).

**Org settings:** In GitHub, enable **Secret scanning** + **Push protection**, and branch protection requiring the **Security — Secret scanning** workflow to pass ([`SECURITY.md`](SECURITY.md) checklist).

Required variables:
- `JWT_SECRET` — generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `KEY_ENCRYPTION_SECRET` — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (different per environment)
- `NVIDIA_API_KEY` — get free at [build.nvidia.com](https://build.nvidia.com)
- `DATABASE_URL` — Railway PostgreSQL (auto-injected when you add the addon)
- `ALLOWED_ORIGINS` — frontend origins trusted by Express (`server/` CORS); comma-separated
- `JAVA_ALLOWED_ORIGINS` — middleware origins only for Spring Boot CORS (`backend/`); defaults to `http://localhost:4000`
- `JAVA_BACKEND_URL` — URL of your Spring Boot service on Railway
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` — Supabase connection string

### 3. Run Locally

```bash
# Terminal 1 — Java backend
cd backend && mvn spring-boot:run

# Terminal 2 — Node middleware
cd server && npm run dev

# Terminal 3 — Frontend
cd packages/frontend && npm run dev
```

App: http://localhost:5173  
Middleware: http://localhost:4000  
Java API: http://localhost:8080

## Deployment

### Railway (Node Middleware + PostgreSQL)

1. Create a new Railway project
2. Add the `server/` folder as a service (it has `nixpacks.toml`)
3. Add **PostgreSQL** addon → `DATABASE_URL` is auto-injected
4. Set environment variables (see `.env.example`)

### Railway (Java Backend)

1. Add the `backend/` folder as a second Railway service
2. It has `backend/nixpacks.toml` and `backend/railway.json`
3. Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` from your Supabase project
4. **`DDL_AUTO`** must be **`validate`** (omit or set explicitly). `update` / `create` / `create-drop` are refused at startup for PostgreSQL (`HibernateSchemaGuard`).
5. Set **`JAVA_ALLOWED_ORIGINS`** to your deployed Node middleware URL (e.g. `https://your-middleware.up.railway.app`). Spring must only trust the middleware, not browser origins.

### Vercel (Frontend)

1. Import `packages/frontend` folder
2. Set `VITE_MIDDLEWARE_URL` = your Railway Node service URL
3. `vercel.json` is already configured for React Router rewrites

## AI Features

All AI is powered by **NVIDIA NIM** (`meta/llama-3.3-70b-instruct`):

- **Smart transaction input** — type naturally: "spent ₹500 at Swiggy"
- **Auto-categorization** — AI categorizes transactions automatically
- **Yugi Oracle chat** — conversational AI with access to your real financial data via tool calling
- **Financial insights** — 4 personalized insights from your spending patterns
- **Forecasting** — net worth projections at 5, 10, 20 years
- **Tax suggestions** — actionable tax optimization advice
- **File/statement analysis** — parse bank statements and bills

Get your free NVIDIA API key at [build.nvidia.com](https://build.nvidia.com) → API Key.

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list with descriptions.
