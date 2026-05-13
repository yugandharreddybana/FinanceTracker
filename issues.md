# FinanceTracker — Production Security & Quality Audit

Audit scope: runtime code only (`backend/`, `server/`, `packages/frontend/src/`). Repo: `https://github.com/yugandharreddybana/FinanceTracker`.

---

## Phases

| Phase | Description | Primary paths |
|-------|-------------|---------------|
| **Phase 1** | Backend persistence & domain models | `backend/src/main/java/com/financetracker/model/`, `repository/` |
| **Phase 2** | Backend business logic & REST controllers | `backend/src/main/java/com/financetracker/service/`, `controller/` |
| **Phase 3** | Backend cross-cutting security & jobs | `backend/src/main/java/com/financetracker/config/`, `scheduler/` |
| **Phase 4** | Express core: bootstrap, CORS, cookies, global errors | `server/index.ts`, `server/lib/auth.ts` |
| **Phase 5** | Express auth routes & finance proxy | `server/routes/auth.ts`, `server/routes/finance.ts` |
| **Phase 6** | Express AI & external investment APIs | `server/routes/ai.ts`, `server/routes/investment.ts` |
| **Phase 7** | Frontend transport, parsing, shell | `packages/frontend/src/services/api.ts`, `App.tsx`, `lib/transactionParser.ts`, `context/` |
| **Phase 8** | Tests, observability, prod readiness | `server/test/`, `e2e/`, `backend/src/test/` |

---

## Issues

**Issue number:** Phase1.0001  
**Issue level:** medium  
**Issue:** `Transaction` and related entities expose Lombok `@Data` on JPA entities — `equals`/`hashCode` across full graph risk subtle persistence bugs and accidental leaks in logs. Files: `backend/.../model/Transaction.java` (and siblings using `@Data` on `@Entity`).  
**Solution:** Replace `@Data` with `@Getter @Setter`; explicit `equals`/`hashCode` on immutable business key (`id`) only; avoid logging entities verbatim.

**Issue number:** Phase2.0001  
**Issue level:** high  
**Issue:** Finance mutations depend on optimistic locking and multi-step deltas (accounts, budgets, savings); under sustained contention or partial failures, operators need deterministic reconciliation jobs — none visible in codebase. Files: `backend/.../service/TransactionService.java`.  
**Solution:** Add scheduled reconciliation (sum txs vs bank balances per user) + alert on drift; document recovery playbook.

**Issue number:** Phase2.0002  
**Issue level:** medium  
**Issue:** `applyBalanceDelta` resolves bank by `findById(tx.getAccount())` treating account name as ID fallback — ambiguous if naming collisions or legacy data; wrong account can move balances. Files: `TransactionService.java` (`applyBalanceDelta`).  
**Solution:** Require stable account UUID in API; deprecate name-as-key path; migration to enforce FK-style account reference.

**Issue number:** Phase2.0003  
**Issue level:** medium  
**Issue:** Bulk update path applies balance deltas inside single transaction without same `REQUIRES_NEW` pattern used elsewhere — divergent failure semantics vs single-tx delete/create. Files: `TransactionService.java` (`doBulkUpdate`).  
**Solution:** Align bulk update with `applyBalanceDeltaWithRetryInNewTransaction` per row or document intentional coupling and test rollback cases.

**Issue number:** Phase3.0001  
**Issue level:** critical  
**Issue:** Documented “Layer 2” ECDSA request signing exists (`server/middleware/auth.ts` → `strictAuthMiddleware`) but is **never mounted** on `/api/finance` or other routers — only JWT Layer 1 applies. Stolen JWT ⇒ full read/write until expiry. Files: `server/middleware/auth.ts`; `server/routes/finance.ts` uses `routes/auth` middleware.  
**Solution:** Enforce `strictAuthMiddleware` on all mutating finance routes (or mTLS / step-up tokens); remove dead code if intentionally abandoned.

**Issue number:** Phase3.0002  
**Issue level:** low  
**Issue:** JWT filter builds JSON error via string concat (`JwtAuthenticationFilter.java` `deny()`); safe today (fixed strings) but fragile if messages ever include user input.  
**Solution:** Use `ObjectMapper.writeValueAsString(Map.of("error", reason))` or Spring `ProblemDetail`.

**Issue number:** Phase3.0003  
**Issue level:** medium  
**Issue:** Signature verification compares Base64URL strings via `MessageDigest.isEqual` on UTF-8 bytes — prefer decoding both sides to raw bytes per JWT best practice. File: `JwtAuthenticationFilter.java`.  
**Solution:** Base64-decode `parts[2]` and compare fixed-length byte arrays with `MessageDigest.isEqual`.

**Issue number:** Phase4.0001  
**Issue level:** high  
**Issue:** Production gate requires `DATABASE_URL` (`server/index.ts`) but `server/lib/auth.ts` still defaults to **file-backed** `data/users.json` when `ALLOW_INSECURE_FILE_AUTH_STORE=true` — horizontal scaling breaks and filesystem races corrupt auth. Files: `server/lib/auth.ts`, `server/index.ts`.  
**Solution:** Mandatory Postgres (or Redis) user store in prod; remove file fallback flag except local dev; implement migrations.

**Issue number:** Phase4.0002  
**Issue level:** medium  
**Issue:** `auth.ts` header comments claim RS256 server JWT + per-op ECDSA — implementation uses **HS256** `JWT_SECRET` (`createToken`/`verifyToken`). Misleading for reviewers and integrators. File: `server/lib/auth.ts`.  
**Solution:** Fix documentation or migrate to asymmetric JWT consistently across Node + Java.

**Issue number:** Phase4.0003  
**Issue level:** medium  
**Issue:** Global error handler attaches CORS headers only when `Origin` matches allowlist — errors from non-browser clients lack consistent JSON shape documentation; `message` field leaks in non-prod only (acceptable) but prod still logs stack to stdout. File: `server/index.ts`.  
**Solution:** Structured logging (correlation ID already partial); redact bodies in logs; unify error JSON schema.

**Issue number:** Phase4.0004  
**Issue level:** low  
**Issue:** Health probe targets Java backend default `http://localhost:8080` in one branch vs finance proxy default `8081` — misleading “degraded” in mixed local setups. File: `server/index.ts` (~line 150).  
**Solution:** Single env-driven base URL constant shared across health + proxy warnings.

**Issue number:** Phase5.0001  
**Issue level:** critical  
**Issue:** Hardcoded email verification bypass for `demo@yugifinance.com` in `verifiedEmailMiddleware` — permanent demo backdoor in production auth path. File: `server/routes/auth.ts`.  
**Solution:** Gate demo bypass behind `NODE_ENV !== 'production'` + explicit env flag; rotate demo credentials; monitor misuse.

**Issue number:** Phase5.0002  
**Issue level:** critical  
**Issue:** `DELETE /account` trusts `req.body.email` when JWT missing/partial (`payload?.email || req.body.email`) allowing cross-user deletion attempts if combined with weak token parsing elsewhere. File: `server/routes/auth.ts`.  
**Solution:** Require valid JWT always; derive email **only** from token; ignore body email; CSRF token for cookie-auth deletes.

**Issue number:** Phase5.0003  
**Issue level:** high  
**Issue:** Account purge calls Spring with `BACKEND_URL` default **`http://localhost:8080`** while finance proxy defaults **`8081`** — purge may silently fail (logged only). File: `server/routes/auth.ts` (top `BACKEND_URL`).  
**Solution:** Align defaults and env vars with `JAVA_BACKEND_URL`; fail closed if purge HTTP not 2xx.

**Issue number:** Phase5.0004  
**Issue level:** medium  
**Issue:** Email OTP stored **plaintext** in memory fallback (`memOtpStore`) when Redis absent — dev laptops risk swap leaks. File: `server/routes/auth.ts` (`storeOtp` else branch).  
**Solution:** Require Redis for any shared/dev-team environment; hash in-memory path same as Redis path.

**Issue number:** Phase5.0005  
**Issue level:** high  
**Issue:** `sendOtpEmail`, `sendVerificationEmail` are **TODO stubs** — if `EMAIL_PROVIDER_CONFIGURED` is true but SDK not wired, emails are silently not sent while API returns success (`register`, `forgot-password`). Files: `server/routes/auth.ts`.  
**Solution:** Feature-flag until SendGrid/nodemailer implemented; health check asserts SMTP send success in staging.

**Issue number:** Phase5.0006  
**Issue level:** medium  
**Issue:** WebAuthn upstream failure returns `details: text` body from Java to client on login verify failure — may leak stack fragments. File: `server/routes/auth.ts` (`/webauthn/login/verify`).  
**Solution:** Map upstream errors to opaque codes; log details server-side only.

**Issue number:** Phase5.0007  
**Issue level:** medium  
**Issue:** Audit log bulk POST forwards items sequentially without transaction boundary — partial sync loses audit integrity under failure. File: `server/routes/auth.ts` (`proxyAuditToBackend`).  
**Solution:** Batch endpoint on Spring side or retry queue with idempotency keys.

**Issue number:** Phase5.0008  
**Issue level:** high  
**Issue:** Finance proxy returns `PROXIED_DEBUG_ERROR` with **`rawBody`** from upstream — can expose correlation IDs, validation messages, or internal shapes useful for attacker probing. File: `server/routes/finance.ts`.  
**Solution:** Strip to `{ code, safeMessage }` whitelist in prod; keep raw detail server-side logs only.

**Issue number:** Phase5.0009  
**Issue level:** medium  
**Issue:** Optimistic-lock / debug instrumentation (`appendAgentDebugNdjson`, session tags, console noise) left in finance proxy — increases attack surface for log injection and disk fills if paths writable. File: `server/routes/finance.ts`.  
**Solution:** Gate behind `DEBUG_PROXY=true`; disable in production builds.

**Issue number:** Phase6.0001  
**Issue level:** medium  
**Issue:** AI routes return raw `error.message` from NVIDIA/upstream on **500** responses — can leak API keys fragments, rate-limit internals, or prompt echoes. Files: `server/routes/ai.ts` (multiple `catch` blocks).  
**Solution:** Map to generic client message; log structured server-side.

**Issue number:** Phase6.0002  
**Issue level:** medium  
**Issue:** `/insights` trusts client-supplied `transactions` JSON — attacker with valid JWT can inflate/deflate advisor output (integrity not finance ledger but misleads user). File: `server/routes/ai.ts`.  
**Solution:** Always fetch transactions via `callBackend` using JWT; ignore client bulk where integrity matters.

**Issue number:** Phase6.0003  
**Issue level:** medium  
**Issue:** `/categorize` accepts unbounded `targets` array length — large payloads multiply LLM cost / cause DoS. File: `server/routes/ai.ts`.  
**Solution:** Cap length (e.g. ≤100) and total JSON bytes; return 413.

**Issue number:** Phase6.0004  
**Issue level:** low  
**Issue:** `/forecast` passes numeric inputs straight into model prompt — no bounds; absurd values yield nonsense projections presented as advice. File: `server/routes/ai.ts`.  
**Solution:** Validate ranges server-side; disclaimer metadata in response.

**Issue number:** Phase6.0005  
**Issue level:** medium  
**Issue:** Tax suggestions output is **not** professional tax advice — no jurisdiction guardrails; compliance risk if marketed as filing guidance. File: `server/routes/ai.ts`.  
**Solution:** Add jurisdiction field + static disclaimer + block filing-specific claims.

**Issue number:** Phase6.0006  
**Issue level:** low  
**Issue:** Investment quotes call Alpha Vantage with user-supplied `symbol` — validated alphanum but no contract on equity vs FX symbols; mock path adds random jitter misleading tests. File: `server/routes/investment.ts`.  
**Solution:** Symbol allowlist per market; deterministic mocks behind flag.

**Issue number:** Phase7.0001  
**Issue level:** high  
**Issue:** Frontend `apiFetch` sends debug ingest `fetch` to `127.0.0.1:7877` for DELETE probes — useless in prod, noisy, potential SSRF policy confusion; leftover from IDE sessions. File: `packages/frontend/src/services/api.ts`.  
**Solution:** Remove or guard with `import.meta.env.DEV && import.meta.env.VITE_AGENT_DEBUG===true`.

**Issue number:** Phase7.0002  
**Issue level:** medium  
**Issue:** Client-side optimistic balance adjustment on delete subtracts `amount` regardless of INCOME vs EXPENSE — can corrupt displayed balances until refresh. File: `packages/frontend/src/context/FinanceContext.tsx` (`deleteTransaction`).  
**Solution:** Apply signed delta based on `tx.type` or skip optimistic patch and rely on spinner.

**Issue number:** Phase7.0003  
**Issue level:** medium  
**Issue:** Smart/local parsers (`transactionParser.ts`) and AI flows can categorize incorrectly — no server-side secondary validation before persist beyond Spring validation. Files: `packages/frontend/src/lib/transactionParser.ts`, AI Smart Add.  
**Solution:** Require user confirmation for AI-created txs above threshold (partially exists for oracle — extend Smart Add).

**Issue number:** Phase7.0004  
**Issue level:** low  
**Issue:** Any user-generated strings rendered in React without centralized sanitization policy — risk if markdown/HTML components introduced later. Files: various `components/*.tsx`.  
**Solution:** Enforce `dangerouslySetInnerHTML` ban via ESLint; use markdown sanitizer.

**Issue number:** Phase8.0001  
**Issue level:** high  
**Issue:** No automated tests proving balance conservation across create/update/delete under concurrency — finance correctness unverified in CI. Files: backend tests sparse vs domain complexity.  
**Solution:** Add integration tests (Testcontainers H2/Postgres) for ledger invariants.

**Issue number:** Phase8.0002  
**Issue level:** medium  
**Issue:** E2E specs exist but coverage vs OWASP flows (auth bypass, IDOR, CSRF cookie mutations) not evident from layout — regression risk. Folder: `e2e/`.  
**Solution:** Add security-focused Playwright suite for cookie CSRF + cross-account forbidden checks.

**Issue number:** Phase8.0003  
**Issue level:** medium  
**Issue:** Rate limits relax massively in non-production (`max: 1000`) — staging mirrors prod poorly; perf tests may hide abuse paths. Files: `server/routes/auth.ts`, `finance.ts`, `ai.ts`.  
**Solution:** `STAGING_PROFILE` env with prod-like limits; separate load-test profile.

**Issue number:** Phase8.0004  
**Issue level:** critical  
**Issue:** Java backend ships debug `AgentDebugLog` NDJSON writer (`backend/.../debug/AgentDebugLog.java`) tied to session filename — writes filesystem from request path; violates least privilege and retention policies for prod finance hosts.  
**Solution:** Delete agent logging from production builds or guard with profile `debug-agent`; use centralized logging only.

**Issue number:** Phase3.0004  
**Issue level:** medium  
**Issue:** Spring Boot Actuator present (`spring-boot-starter-actuator` in `pom.xml`) — endpoints must be locked down; verify exposure via `management.endpoints.web.exposure` (properties not audited here). File: `backend/pom.xml`.  
**Solution:** Expose only `health` publicly; secure others with admin auth / network policy.

**Issue number:** Phase5.0010  
**Issue level:** medium  
**Issue:** CORS allows credentials with explicit origin list — good — but `OPTIONS` returns **403** when origin absent/non-whitelisted; some proxy health checks may behave oddly (low risk). File: `server/index.ts`.  
**Solution:** Document; optional dedicated `/api/health` without credentials requirement already exists.

**Issue number:** Phase6.0007  
**Issue level:** low  
**Issue:** Chat stream proxies NVIDIA SSE raw to client — no server-side content moderation or PII scrubbing before persistence/logging. File: `server/routes/ai.ts` `/chat-stream`.  
**Solution:** Stream transformer scrubbing known PII patterns if logs retained.

**Issue number:** Phase2.0010  
**Issue level:** medium  
**Issue:** Recurring scheduler auto-posting payments (`RecurringPaymentScheduler.java`) can duplicate charges if clock skew / missed dedupe keys — needs idempotency per recurrence instance. File: `backend/.../scheduler/RecurringPaymentScheduler.java`.  
**Solution:** Unique `(user_id, recurring_id, occurrence_date)` constraint + upsert.

---

**Memory anchor:** Use issue IDs (`PhaseX.YYYY`) when batching fixes — each maps to file paths above.
