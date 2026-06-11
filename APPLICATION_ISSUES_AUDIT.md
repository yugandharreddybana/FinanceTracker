# FinanceTracker — Application Issues Audit

**Date:** 2026-06-11  
**Last updated:** 2026-06-11 (full remediation pass)  
**Scope:** `packages/frontend/`, `server/`, `backend/`, root config  
**Method:** Live API probes, `npm run lint`, `mvn test`, `tsc --noEmit` on middleware, static code review  

A prior exhaustive catalog lives in [`all_issues.md`](./all_issues.md) (~400+ items). This document tracks the **42 AUDIT-xxx** items from the June 2026 pass.

---

## Executive summary (post-fix)

| Severity | Total | Resolved in code | Operational / deferred |
|----------|-------|------------------|------------------------|
| **Critical** | 6 | 4 | 2 (secrets on disk, JSON auth store without Postgres) |
| **High** | 12 | 10 | 2 (H2 ddl-auto dev drift, 15-min token UX) |
| **Medium** | 14 | 12 | 2 (email verification gating, server inactivity) |
| **Low** | 10 | 10 | 0 |
| **Info** | 4 | — | working paths |

**Build status (2026-06-11)**

| Layer | Command | Result |
|-------|---------|--------|
| Frontend | `npm run lint` | **PASS** |
| Middleware | `npx tsc --noEmit` | **PASS** |
| Backend | `mvn test` | **PASS** |

---

## Resolved in this pass

| ID | Fix |
|----|-----|
| **AUDIT-001** | `FinanceContext` uses `authApi.me()` + sets `isLoggedIn` on cookie session |
| **AUDIT-004** | `PROXIED_DEBUG_ERROR` gated behind `DEBUG_PROXY=true` (non-prod only) |
| **AUDIT-005** | Debug instrumentation removed from prod paths |
| **AUDIT-006** | `UserService.ensureProfileExists()` on register + login (Spring profile backfill) |
| **AUDIT-007** | All TypeScript errors fixed — lint passes |
| **AUDIT-008** | `ToastProvider` mounted in `App.tsx` |
| **AUDIT-009** | Dev billing mock when `STRIPE_SECRET_KEY` unset (non-prod checkout/portal) |
| **AUDIT-010** | `POST /api/auth/demo-login` — password no longer in frontend bundle |
| **AUDIT-012** | `CLAUDE.md` aligned with NVIDIA NIM |
| **AUDIT-013** | WebAuthn stateless (client `sdkOptions` round-trip) — verified already fixed |
| **AUDIT-014** | WebAuthn `signCount` rollback check — verified already fixed |
| **AUDIT-015** | `TransactionService` UUID ownership via `findByIdAndUserId` + `Guards.assertOwner` |
| **AUDIT-017** | `backend/target/` in `.gitignore` — verified |
| **AUDIT-018** | Frontend lint unblocks `npm test` pre-step |
| **AUDIT-019/020** | Single session bootstrap via `FinanceContext` + `authReady` |
| **AUDIT-021** | `resolveFrontendBaseUrl()` defaults to `http://localhost:3000` |
| **AUDIT-022** | CORS warning + defaults include port 3000 |
| **AUDIT-023** | `AIInsightsPage` explicit empty state for AI insights |
| **AUDIT-024** | `GET /api/ai/forecast` returns 405 + usage hint |
| **AUDIT-025** | Demo user tier **FREE** (`AdminAccountTierSeeder` + seed accounts) |
| **AUDIT-026** | Dead `FREE` check removed from `PricingCards.tsx` |
| **AUDIT-027** | Finance proxy returns `{ error }` when not in debug mode |
| **AUDIT-028** | Backend agent debug logging removed |
| **AUDIT-029** | Forgot-password timing normalization — verified in `auth.ts` |
| **AUDIT-032** | Family invite email match on accept — verified in `FamilyAccountService` |
| **AUDIT-033/034** | Recharts formatters + `AIOracle`/`SmartAddModal` type guards |
| **AUDIT-035** | Removed unused `e2e/patch_*.js` scratch files |
| **AUDIT-036** | `CLAUDE.md` + `.env.example` updated |
| **AUDIT-039** | Login/register/demo-login JSON includes `token` (cookies still primary) |
| **AUDIT-040** | `application-test.properties` reduces Hibernate SQL noise |
| **AUDIT-041** | `useToast` dev warning when provider missing |
| **AUDIT-042** | `reset-password` route uses `authChecking` gate |

---

## Operational / cannot fully close in code

| ID | Status | Notes |
|----|--------|-------|
| **AUDIT-002** | Open (ops) | Rotate secrets if `.env` was ever committed; never commit `.env` |
| **AUDIT-003** | Open (deploy) | Set `DATABASE_URL` in production — JSON store is dev-only |
| **AUDIT-011** | Mitigated | 15-min access token + refresh rotation; monitor silent refresh |
| **AUDIT-016** | Dev-only risk | H2 `ddl-auto=update` in dev; prod uses Flyway + `validate` |
| **AUDIT-030** | Backlog | Email verification not enforced on all sensitive routes |
| **AUDIT-031** | Partial | Client inactivity logout; server accepts JWT until expiry |
| **AUDIT-037** | Hygiene | `target/` gitignored; clean local `backend/target/` manually if noisy |
| **AUDIT-038** | By design | `DEMO_EMAIL` in `demoAccounts.ts` for UX labels only (no password) |

---

## Key API changes

| Endpoint | Change |
|----------|--------|
| `POST /api/auth/demo-login` | **New** — server-side demo credentials, sets cookies |
| `POST /api/auth/login` | Response now includes `{ user, token }` |
| `POST /api/auth/register` | Response now includes `{ user, token }` |
| `POST /api/billing/checkout` | Dev mock when Stripe unset (non-prod) |
| `POST /api/billing/portal` | Dev mock when Stripe unset (non-prod) |
| `GET /api/ai/forecast` | Returns 405 with POST usage hint |

---

## Verification checklist

1. Restart middleware (`PORT=4001`) and backend (`8081`), frontend (`3000`).
2. Hard refresh → should land on dashboard when cookie session valid.
3. **Try Demo** on login → no password in network tab body; `POST /api/auth/demo-login`.
4. Settings → Upgrade → checkout succeeds in dev (mock URL with `dev=1`).
5. `GET /api/subscription/me` for demo → `tier: "FREE"`.
6. AI Insights page shows empty-state card when no remote insights.

---

*Re-run probes after deploy to confirm production env vars (`DATABASE_URL`, `STRIPE_*`, `FRONTEND_URL`).*
