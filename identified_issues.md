# FinanceTracker — Identified issues snapshot

This file is a **secondary** checklist versus [`issues.md`](issues.md) (canonical Phase IDs).

## Resolved or stale (re-checked)

1. **TypeScript / ErrorBoundary / main.tsx** — `main.tsx` imports `ErrorBoundary` from `components/ErrorBoundary.tsx` only; no duplicate class. Current builds pass `npm run build -w packages/frontend`.

2. **SpendingTrends `unknown[]`** — `currencies` is explicitly `string[]` (`SpendingTrends.tsx`).

3. **`|| -10` net worth** — not present in source (grep clean); prior MEMORY note stands.

4. **Reset password contract** — backend accepts **`{ token, newPassword }`** or **`{ email, otp, newPassword }`** (`server/routes/auth.ts`). Frontend posts token flow (`ResetPasswordPage.tsx`).

5. **Email “configured” but no send** — `emailDeliveryConfigured()` requires **`SENDGRID_API_KEY` + `EMAIL_FROM`**. SendGrid v3 send is implemented via **`fetch`** (`server/routes/auth.ts`). Reset email includes OTP + link.

6. **Exposed keys in examples** — use placeholders only in repo `.env.example`; rotate any real keys that were ever committed.

## Still product / architecture work (not “one fix”)

- **Postgres-backed Node users** — env gate exists; JSON file store remains until migrated (`Phase4.0001`).

- **Finance Layer‑2 signing** — middleware exists; mounting on `/api/finance` needs a signing client (`Phase3.0001`).

- **Ledger reconciliation job + CI proofs** — `Phase2.0001`, `Phase8.0001`.

- **Smart Add confirmation thresholds / notification encryption** — `Phase7.0003`–`0005`.
