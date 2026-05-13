# FinanceTracker — Production Security & Quality Audit

Audit scope: runtime code only (`backend/`, `server/`, `packages/frontend/src/`). Repo: `https://github.com/yugandharreddybana/FinanceTracker`.

<phases>

Phase 1: Backend persistence & domain models — `backend/src/main/java/com/financetracker/model/`, `backend/src/main/java/com/financetracker/repository/`

Phase 2: Backend business logic & REST controllers — `backend/src/main/java/com/financetracker/service/`, `controller/`, `scheduler/`

Phase 3: Backend cross-cutting security & infrastructure — `backend/src/main/java/com/financetracker/config/`, `util/Guards.java`

Phase 4: Express bootstrap, cookies, CORS, global errors — `server/index.ts`, `server/lib/auth.ts`

Phase 5: Express auth routes & finance proxy — `server/routes/auth.ts`, `server/routes/finance.ts`, `server/middleware/auth.ts`

Phase 6: Express AI & external investment APIs — `server/routes/ai.ts`, `server/routes/investment.ts`

Phase 7: Frontend transport, parsing, shell — `packages/frontend/src/services/api.ts`, `App.tsx`, `lib/transactionParser.ts`, `context/`, `components/`

Phase 8: Automated tests & prod readiness — `server/test/`, `e2e/`, `backend/src/test/` (code only)

</phases>

<issues>

Issue number: Phase1.0001
Issue level: medium
Issue: `Transaction` and related entities expose Lombok `@Data` on JPA entities — `equals`/`hashCode` across full graph risk subtle persistence bugs and accidental leaks in logs. Files: `backend/src/main/java/com/financetracker/model/Transaction.java` (and siblings using `@Data` on `@Entity`).
Solution: Replace `@Data` with `@Getter @Setter`; explicit `equals`/`hashCode` on immutable business key (`id`) only; avoid logging entities verbatim.

Issue number: Phase2.0001
Issue level: high
Issue: Finance mutations depend on optimistic locking and multi-step deltas (accounts, budgets, savings); under sustained contention or partial failures, operators need deterministic reconciliation jobs — none visible in codebase. Files: `backend/src/main/java/com/financetracker/service/TransactionService.java`.
Solution: Add scheduled reconciliation (sum txs vs bank balances per user) + alert on drift; document recovery playbook.

Issue number: Phase2.0002
Issue level: medium
Issue: `applyBalanceDelta` resolves bank by `findById(tx.getAccount())` with name fallbacks — ambiguous if naming collisions or legacy data; wrong account can move balances. Files: `TransactionService.java` (`applyBalanceDelta`).
Solution: Require stable account UUID in API; deprecate name-as-key path; migration to enforce FK-style account reference.

Issue number: Phase2.0003
Issue level: medium
Issue: Bulk update path (`doBulkUpdate`) applies balance deltas via `applyBalanceDelta` inside a single `@Transactional` boundary without the `REQUIRES_NEW` pattern used on create/delete/bulk-delete — divergent failure semantics vs other mutation paths. Files: `TransactionService.java` (~lines 270–285).
Solution: Align bulk update with `applyBalanceDeltaWithRetryInNewTransaction` per row or document intentional coupling and add rollback/integration tests.

Issue number: Phase2.0010
Issue level: medium
Issue: Recurring scheduler auto-posting payments (`RecurringPaymentScheduler.java`) can duplicate charges if clock skew / missed dedupe keys — needs idempotency per recurrence instance. File: `backend/src/main/java/com/financetracker/scheduler/RecurringPaymentScheduler.java`.
Solution: Unique `(user_id, recurring_id, occurrence_date)` constraint + upsert.

Issue number: Phase3.0001
Issue level: critical
Issue: Documented “Layer 2” ECDSA request signing exists (`server/middleware/auth.ts` → `strictAuthMiddleware`) but is not mounted on `/api/finance` — only JWT Layer 1 applies. Stolen JWT ⇒ full read/write until expiry. Files: `server/middleware/auth.ts`; `server/routes/finance.ts` uses `authMiddleware` from `routes/auth.js`.
Solution: Enforce `strictAuthMiddleware` on all mutating finance routes (or mTLS / step-up tokens); remove dead code if intentionally abandoned.

Issue number: Phase3.0002
Issue level: low
Issue: JWT filter builds JSON error via string concat (`JwtAuthenticationFilter.java` `deny()`); safe today (fixed strings) but fragile if messages ever include user input.
Solution: Use `ObjectMapper.writeValueAsString(Map.of("error", reason))` or Spring `ProblemDetail`.

Issue number: Phase3.0003
Issue level: medium
Issue: Signature verification compares Base64URL strings via `MessageDigest.isEqual` on UTF-8 bytes — prefer decoding both sides to raw bytes per JWT best practice. File: `JwtAuthenticationFilter.java`.
Solution: Base64-decode `parts[2]` and compare fixed-length byte arrays with `MessageDigest.isEqual`.

Issue number: Phase3.0004
Issue level: medium
Issue: Spring Boot Actuator present (`spring-boot-starter-actuator` in `pom.xml`) — endpoints must be locked down; verify exposure via `management.endpoints.web.exposure` (application properties not exhaustively audited here). File: `backend/pom.xml`.
Solution: Expose only `health` publicly; secure others with admin auth / network policy.

Issue number: Phase4.0001
Issue level: high
Issue: Production gate requires `DATABASE_URL` (`server/index.ts`) but `server/lib/auth.ts` still allows **file-backed** `data/users.json` when `ALLOW_INSECURE_FILE_AUTH_STORE=true` — horizontal scaling breaks and filesystem races corrupt auth.
Solution: Mandatory Postgres (or Redis) user store in prod; remove file fallback flag except local dev; implement migrations.

Issue number: Phase4.0002
Issue level: medium
Issue: `server/lib/auth.ts` header comments claim RS256 server JWT + per-op ECDSA — implementation uses **HS256** `JWT_SECRET` (`createToken`/`verifyToken`). Misleading for reviewers and integrators.
Solution: Fix documentation or migrate to asymmetric JWT consistently across Node + Java.

Issue number: Phase4.0003
Issue level: medium
Issue: Global error handler attaches CORS headers only when `Origin` matches allowlist; prod logs stack to stdout; inconsistent error JSON for non-browser clients. File: `server/index.ts`.
Solution: Structured logging with correlation ID; redact bodies in logs; unify error JSON schema.

Issue number: Phase4.0004
Issue level: low
Issue: Health probe targets Java backend default `http://localhost:8080` in one branch vs finance proxy default `8081` — misleading “degraded” in mixed local setups. File: `server/index.ts`.
Solution: Single env-driven base URL constant shared across health + proxy warnings.

Issue number: Phase5.0001
Issue level: critical
Issue: Hardcoded email verification bypass for `demo@yugifinance.com` in `verifiedEmailMiddleware` — permanent demo backdoor on production-gated routes. File: `server/routes/auth.ts` (~lines 287–291).
Solution: Gate demo bypass behind `NODE_ENV !== 'production'` + explicit env flag; rotate demo credentials; monitor misuse.

Issue number: Phase5.0002
Issue level: critical
Issue: `DELETE /account` uses `payload?.email || (req.body && req.body.email)` when JWT may be absent — enables account-targeting via body (CSRF / confused deputy) if cookie or transport is abused. File: `server/routes/auth.ts` (~lines 537–541).
Solution: Require valid JWT always; derive email **only** from token; reject body `email`; add CSRF protection for cookie-auth destructive actions.

Issue number: Phase5.0003
Issue level: high
Issue: Account purge calls Spring with `BACKEND_URL` default **`http://localhost:8080`** while finance proxy warns **`8081`** — purge may silently fail (logged only). File: `server/routes/auth.ts` (top `BACKEND_URL`).
Solution: Align defaults and env vars with `JAVA_BACKEND_URL`; fail closed if purge HTTP not 2xx.

Issue number: Phase5.0004
Issue level: medium
Issue: Email OTP stored **plaintext** in memory fallback (`memOtpStore`) when Redis absent — dev laptops risk swap leaks. File: `server/routes/auth.ts` (`storeOtp` else branch).
Solution: Require Redis for any shared/dev-team environment; hash in-memory path same as Redis path.

Issue number: Phase5.0005
Issue level: high
Issue: `sendOtpEmail`, `sendVerificationEmail` may be stubs — if `EMAIL_PROVIDER_CONFIGURED` is true but SDK not wired, emails are silently not sent while API returns success (`register`, `forgot-password`). Files: `server/routes/auth.ts`.
Solution: Feature-flag until SendGrid/nodemailer implemented; health check asserts SMTP send success in staging.

Issue number: Phase5.0006
Issue level: medium
Issue: WebAuthn upstream failure returns raw Java body on login verify failure — may leak stack fragments. File: `server/routes/auth.ts` (`/webauthn/login/verify`).
Solution: Map upstream errors to opaque codes; log details server-side only.

Issue number: Phase5.0007
Issue level: medium
Issue: Audit log bulk POST forwards items sequentially without transaction boundary — partial sync loses audit integrity under failure. File: `server/routes/auth.ts` (`proxyAuditToBackend`).
Solution: Batch endpoint on Spring side or retry queue with idempotency keys.

Issue number: Phase5.0008
Issue level: high
Issue: Finance proxy returns `PROXIED_DEBUG_ERROR` with **`rawBody`** from upstream — can expose correlation IDs, validation messages, or internal shapes useful for attacker probing. File: `server/routes/finance.ts`.
Solution: Strip to `{ code, safeMessage }` whitelist in prod; keep raw detail server-side logs only.

Issue number: Phase5.0009
Issue level: medium
Issue: Debug instrumentation (`appendAgentDebugNdjson`, ingest `fetch`, route-entry probes, `console.error` paths) in finance proxy — disk/log noise and enlarged attack surface in prod if enabled. File: `server/routes/finance.ts`.
Solution: Gate behind `DEBUG_PROXY=true`; strip from production builds.

Issue number: Phase5.0010
Issue level: medium
Issue: CORS allows credentials with explicit origin list — `OPTIONS` returns **403** when origin absent/non-whitelisted; some proxy health checks may behave oddly (low risk). File: `server/index.ts`.
Solution: Document behavior; rely on dedicated `/api/health` without credentials where appropriate.

Issue number: Phase6.0001
Issue level: medium
Issue: AI routes return raw `error.message` from NVIDIA/upstream on **500** responses — can leak API key fragments, rate-limit internals, or prompt echoes. Files: `server/routes/ai.ts` (multiple `catch` blocks).
Solution: Map to generic client message; log structured server-side.

Issue number: Phase6.0002
Issue level: medium
Issue: `/insights` trusts client-supplied `transactions` JSON — attacker with valid JWT can distort advisor output (misleading, not ledger mutation). File: `server/routes/ai.ts`.
Solution: Always fetch transactions via backend proxy using JWT; ignore client bulk where integrity matters.

Issue number: Phase6.0003
Issue level: medium
Issue: `/categorize` accepts unbounded `targets` array length — large payloads multiply LLM cost / cause DoS. File: `server/routes/ai.ts`.
Solution: Cap length (e.g. ≤100) and total JSON bytes; return 413.

Issue number: Phase6.0004
Issue level: low
Issue: `/forecast` passes numeric inputs straight into model prompt — no bounds; absurd values yield nonsense projections presented as advice. File: `server/routes/ai.ts`.
Solution: Validate ranges server-side; disclaimer metadata in response.

Issue number: Phase6.0005
Issue level: medium
Issue: Tax suggestions output is **not** professional tax advice — no jurisdiction guardrails; compliance risk if marketed as filing guidance. File: `server/routes/ai.ts`.
Solution: Add jurisdiction field + static disclaimer + block filing-specific claims.

Issue number: Phase6.0006
Issue level: low
Issue: Investment quotes call Alpha Vantage with user-supplied `symbol` — validated alphanum but weak contract on equity vs FX; mock path may add random jitter. File: `server/routes/investment.ts`.
Solution: Symbol allowlist per market; deterministic mocks behind flag.

Issue number: Phase6.0007
Issue level: low
Issue: Chat stream proxies NVIDIA SSE raw to client — no server-side content moderation or PII scrubbing before persistence/logging. File: `server/routes/ai.ts` `/chat-stream`.
Solution: Stream transformer scrubbing known PII patterns if logs retained.

Issue number: Phase7.0001
Issue level: high
Issue: Frontend `apiFetch` sends debug ingest `fetch` to `127.0.0.1:7877` for transaction DELETE probes — useless in prod, noisy, confusing for security reviewers. File: `packages/frontend/src/services/api.ts`.
Solution: Remove or guard with `import.meta.env.DEV && import.meta.env.VITE_AGENT_DEBUG===true`.

Issue number: Phase7.0002
Issue level: medium
Issue: Client-side optimistic balance adjustment on delete subtracts `amount` regardless of INCOME vs EXPENSE — can corrupt displayed balances until refresh. File: `packages/frontend/src/context/FinanceContext.tsx` (`deleteTransaction`).
Solution: Apply signed delta based on `tx.type` or skip optimistic patch and rely on loading state + `refreshData`.

Issue number: Phase7.0003
Issue level: medium
Issue: Smart/local parsers (`transactionParser.ts`) and AI flows can categorize incorrectly — limited server-side secondary validation before persist beyond Spring validation. Files: `packages/frontend/src/lib/transactionParser.ts`, Smart Add flows.
Solution: Require user confirmation for AI-created txs above threshold; extend confirmation to Smart Add.

Issue number: Phase7.0004
Issue level: low
Issue: User-generated strings rendered in React without centralized sanitization policy — risk if markdown/HTML rendering is introduced later. Files: various `packages/frontend/src/components/*.tsx`.
Solution: Enforce `dangerouslySetInnerHTML` ban via ESLint; use markdown sanitizer.

Issue number: Phase7.0005
Issue level: medium
Issue: Notification feed persisted to **`localStorage`** (`yugi_finance_notifications`) as plaintext JSON — device compromise or XSS exposes recent activity metadata. Files: `packages/frontend/src/App.tsx` (~lines 99, 182).
Solution: Prefer server-backed notification inbox or encrypt-at-rest wrapper; minimize stored fields; tie lifetime to session policy.

Issue number: Phase7.0006
Issue level: low
Issue: `ErrorBoundary` logs full `error` and `componentStack` via `console.error` — shared workstations / recorded consoles may leak internal UI structure and messages. File: `packages/frontend/src/components/ErrorBoundary.tsx` (~line 16).
Solution: Log opaque correlation ID to console in prod; send details only to trusted telemetry with sampling.

Issue number: Phase8.0001
Issue level: high
Issue: No automated tests proving balance conservation across create/update/delete under concurrency — finance correctness unverified in CI. Files: backend tests sparse vs domain complexity.
Solution: Add integration tests (Testcontainers H2/Postgres) for ledger invariants.

Issue number: Phase8.0002
Issue level: medium
Issue: E2E specs exist but coverage vs OWASP flows (auth bypass, IDOR, CSRF cookie mutations) is incomplete — regression risk. Folder: `e2e/`.
Solution: Add security-focused Playwright suite for cookie CSRF + cross-account forbidden checks.

Issue number: Phase8.0003
Issue level: medium
Issue: Rate limits relax massively in non-production (`max` in thousands) — staging mirrors prod poorly; perf tests may hide abuse paths. Files: `server/routes/auth.ts`, `finance.ts`, `ai.ts`.
Solution: `STAGING_PROFILE` env with prod-like limits; separate load-test profile.

Issue number: Phase8.0004
Issue level: critical
Issue: Java backend ships debug `AgentDebugLog` NDJSON writer (`backend/src/main/java/com/financetracker/debug/AgentDebugLog.java`) — writes filesystem from request paths; violates least privilege and retention policies for prod finance hosts.
Solution: Remove agent logging from production builds or guard with Spring profile `debug-agent`; use centralized logging only.

</issues>

## Implemented or mitigated (code changes)

Full audit closure is not realistic in one change-set: some items need product decisions (Smart Add confirmation thresholds), client changes (Layer‑2 signing on every finance mutation), or CI/Testcontainers work (ledger concurrency proofs). The rows below reflect **what is now addressed in code**.

| Issue ID | Notes |
|----------|--------|
| Phase2.0003 | `doBulkUpdate` now uses `applyBalanceDeltaWithRetryInNewTransaction` for −1/+1 balance passes (`TransactionService.java`). |
| Phase4.0004 | Middleware `/api/health` Java default aligned to port **8081** (`server/index.ts`). |
| Phase5.0001 | Demo email bypass requires **`ALLOW_DEMO_EMAIL_VERIFICATION_BYPASS=true`** when `NODE_ENV=production`; disabled by default (`server/routes/auth.ts`, `.env.example`). |
| Phase5.0002 | `DELETE /api/auth/account` requires JWT-derived email only — **`req.body.email` ignored** (`server/routes/auth.ts`). |
| Phase5.0003 | **`BACKEND_URL`** default in `auth.ts` set to **8081**; `.env.example` **`JAVA_BACKEND_URL`** updated to match. |
| Phase5.0008 | Production **`PROXIED_DEBUG_ERROR.rawBody`** sanitized — whitelisted `error` / `correlationId` only (`server/routes/finance.ts`). |
| Phase5.0009 | Proxy NDJSON + ingest gated by **`DEBUG_PROXY=true`** (`server/routes/finance.ts`). |
| Phase7.0001 | Browser DELETE ingest runs only when **`import.meta.env.DEV && VITE_AGENT_DEBUG==='true'`** (`api.ts`). |
| Phase7.0002 | Optimistic account balance on delete respects **INCOME vs EXPENSE** (`FinanceContext.tsx`). |
| Phase7.0006 | **Console logging only in `import.meta.env.DEV`** (`ErrorBoundary.tsx`). |
| Phase8.0004 | **`AgentDebugLog`** no-ops unless **`FINANCE_TRACKER_AGENT_DEBUG=true`** (`AgentDebugLog.java`, `.env.example`). |
| Phase6.0001 | NVIDIA/Gemini **`catch`** responses use **`aiPublicError()`** — prod returns generic message (`server/routes/ai.ts`). |
| Phase6.0002 | **`/insights`** loads transactions via **`callBackend("/transactions")`**; optional **`selectedBank`** filters by **`account`** (`server/routes/ai.ts`). |
| Phase6.0003 | **`targets`** capped at **100** (413); **`aiLimiter`** on **`/categorize`** and other LLM POSTs (`server/routes/ai.ts`). |
| Phase6.0004 | **`/forecast`** validates **`currentNetWorth`** / **`monthlySavings`** as finite within bounds; **`riskProfile`** truncated (`server/routes/ai.ts`). |
| Phase8.0003 | Finance **`financeLimiter`** uses prod-like **`max`** when **`STRICT_PROXY_RATE_LIMIT=true`** or production (`server/routes/finance.ts`, `.env.example`). AI **`aiLimiter`** respects **`STRICT_AI_RATE_LIMIT`** (`server/routes/ai.ts`). |
| Phase3.0002 | JWT filter **`deny()`** emits JSON via **`ObjectMapper.writeValue`** (`JwtAuthenticationFilter.java`). |
| Phase3.0003 | JWT HMAC verified by **Base64URL-decoding** the signature part to raw bytes vs **`Mac.doFinal`** (`JwtAuthenticationFilter.java`; aligned **`verifyToken`** in `server/lib/auth.ts`). |
| Phase3.0004 | Actuator exposure already **`health`**-only in **`application.properties`** (`management.endpoints.web.exposure.include=health`). |
| Phase4.0002 | **`server/lib/auth.ts`** header documents **HS256 + shared secret** and optional Layer‑2 ECDSA (no RS256 claim). |
| Phase4.0001 | **`auth.ts`** startup gate aligned with **`DATABASE_URL`**: refuses prod **without** DB URL unless **`ALLOW_INSECURE_FILE_AUTH_STORE=true`** (JSON store remains the persistence implementation until Postgres users land). |
| Phase5.0004 | In-memory OTP fallback stores **SHA-256 hex** only (`server/routes/auth.ts`). |
| Phase5.0005 | **SendGrid v3** mail send via **`fetch`** when **`SENDGRID_API_KEY`** + **`EMAIL_FROM`** set; reset email includes **OTP + link**; registration verification email sent best-effort (`server/routes/auth.ts`). **`emailDeliveryConfigured()`** no longer treats stub SMTP as wired. |
| Phase5.0006 | **`/webauthn/login/verify`** hides upstream body in **production** (`server/routes/auth.ts`). |
| Phase6.0005 | **`/tax-suggestions`** returns **`{ jurisdiction, disclaimer, suggestions }`** + safer system prompt (`server/routes/ai.ts`, `aiService.ts`, `TaxEnginePage.tsx`). |
| Phase6.0006 | INR mock quotes use **deterministic** jitter unless **`INVESTMENT_MOCK_JITTER=random`** (`server/routes/investment.ts`). |
| Phase2.0002 | **`applyBalanceDelta`** skips name/bank fallbacks when **`account`** matches a **UUID** shape (`TransactionService.java`). |

**Still open (representative):** Phase1.0001 entity **`@Data`** hygiene; Phase2.0001 automated reconciliation job + alerts; Phase3.0001 enforce **`strictAuthMiddleware`** on finance mutations (needs signing client); Phase4.0001 Postgres-backed user rows (not only env gate); Phase5.0007 audit batch atomicity; Phase6.0007 stream PII scrubbing; Phase7.0003–0005 Smart Add confirmation / notifications storage / sanitization policy; Phase8.0001–0002 automated ledger + security E2E suites; **`auth.ts`** IP rate limits vs **`STRICT_*`** (optional parity).

**Memory anchor:** Use issue IDs (`PhaseX.YYYY`) when batching fixes — each maps to file paths in the phase list above.
