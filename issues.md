# FinanceTracker — Security & Production Readiness Audit

**Audit date:** 2026-05-06
**Branch:** claude/security-audit-financetracker-OC62i
**Auditor:** Senior full-stack security review

---

## Phases

<phases>
Phase 1: Secrets, Configuration, & Deploy Hygiene
  - .env.example, server/.env.example, .gitignore, .claudeignore, package.json, railway.json, backend/railway.json, backend/src/main/resources/application.properties, backend/src/main/resources/application-dev.properties, scratch/fix_db_schema.js, vercel.json

Phase 2: Authentication, Authorization, JWT & WebAuthn
  - server/lib/auth.ts, server/routes/auth.ts, server/middleware/auth.ts, backend/src/main/java/com/financetracker/controller/WebAuthnController.java, backend/src/main/java/com/financetracker/service/WebAuthnService.java, backend/src/main/java/com/financetracker/config/seeder/UserSeeder.java

Phase 3: Express Middleware — Proxy, CORS, Rate Limit, AI, MCP
  - server/index.ts, server/routes/finance.ts, server/routes/ai.ts, server/routes/investment.ts, server/routes/family.ts, server/middleware/rateLimit.ts

Phase 4: Spring Boot Controllers — REST surface & Trust Boundary
  - All files in backend/src/main/java/com/financetracker/controller/*.java, backend/src/main/java/com/financetracker/util/Guards.java, backend/src/main/java/com/financetracker/config/WebConfig.java, backend/src/main/java/com/financetracker/config/GlobalExceptionHandler.java

Phase 5: Domain Services, Models, Money Math & State Mutations
  - backend/src/main/java/com/financetracker/service/{TransactionService,BankAccountService,BudgetService,SavingsGoalService,InvestmentService,LoanService,RecurringPaymentService,UserProfileService,AuditLogService}.java
  - backend/src/main/java/com/financetracker/model/*.java
  - backend/src/main/java/com/financetracker/scheduler/*.java

Phase 6: Frontend — Auth Surface, XSS, Storage & API Calls
  - packages/frontend/src/services/api.ts, aiService.ts, mcpClient.ts
  - packages/frontend/src/components/{LoginPage,SignupPage,SettingsPage,SmartAdd,AIOracle,AuditLogPage}.tsx
  - packages/frontend/src/context/FinanceContext.tsx

Phase 7: Functional / Finance-Ready Correctness (Balances, Recurrences, Bulk Ops)
  - TransactionService balance/budget/savings deltas, BudgetRolloverScheduler, RecurringPaymentScheduler, InvestmentPriceRefreshScheduler

Phase 8: Tests, Observability & Production Gaps
  - server/test/api.test.ts, missing test coverage, console.log noise, monitoring gaps
</phases>

---

## Issues

<issues>

Issue number: Phase1.0001
Issue level: critical
Issue: `.env.example` (line 19) hard-codes a real-looking NVIDIA NIM API key starting with `nvapi-…`. Anyone cloning the repo (or scraping GitHub) gets a live LLM token billable to the owner.
Solution: Replace with placeholder `NVIDIA_API_KEY=your_nvidia_api_key_here`, immediately revoke the leaked key in build.nvidia.com, rotate, and add a pre-commit secret scan (gitleaks/trufflehog).

Issue number: Phase1.0002
Issue level: high
Issue: `scratch/fix_db_schema.js` (line 11) sets `ssl: { rejectUnauthorized: false }` against the production Postgres URL — disables TLS cert validation, enabling MITM credential theft of the DB password.
Solution: Remove the `rejectUnauthorized:false` flag and use `ssl: { rejectUnauthorized: true, ca: fs.readFileSync(process.env.PG_CA_CERT) }`, or delete the script entirely (it lives in `scratch/` and should never ship).

Issue number: Phase1.0003
Issue level: high
Issue: `backend/src/main/resources/application.properties` line 28 defaults `spring.jpa.hibernate.ddl-auto` to `update` in production. Hibernate `update` can silently drop/alter columns and is unsafe for a finance ledger.
Solution: Set `spring.jpa.hibernate.ddl-auto=${DDL_AUTO:validate}` and gate any schema change behind explicit Flyway migration files (already started under `db/migration/`).

Issue number: Phase1.0004
Issue level: medium
Issue: `application.properties` line 8 builds JDBC URL via string concat: `${DB_URL}&currentSchema=finance_app`. If `DB_URL` lacks a `?`, this produces a malformed URL and breaks startup; if it contains user-controlled query params, it can override TLS settings.
Solution: Use `spring.datasource.hikari.connection-init-sql=SET search_path TO finance_app` (already set) and remove the `&currentSchema` concat: `spring.datasource.url=${DB_URL}`.

Issue number: Phase1.0005
Issue level: medium
Issue: `package.json` (root) declares only `"test": "echo \"Error: no test specified\" && exit 1"`. CI cannot enforce regression coverage on a finance app.
Solution: Wire monorepo tests: `"test": "npm test -w server && npm test -w packages/frontend && cd backend && mvn test"`, add Vitest+Supertest server suite, JUnit backend suite, and require green tests on PRs.

Issue number: Phase1.0006
Issue level: low
Issue: Two `.env.example` files (`/.env.example` and `/server/.env.example`) drift in keys (`GEMINI_API_KEY` vs `NVIDIA_API_KEY`, different `ALLOWED_ORIGINS`). Operators copy the wrong one.
Solution: Delete the duplicate; keep one canonical `/.env.example` referenced by all README/docs.

Issue number: Phase2.0001
Issue level: critical
Issue: `server/lib/auth.ts` lines 18–23: when `JWT_SECRET` is missing the server only `console.warn`s and `verifyToken` (line 127) calls `crypto.createHmac("sha256", JWT_SECRET!)` — token verification silently passes with `undefined` secret in dev → forged tokens accepted.
Solution: Hard-fail at boot: in `verifyToken` add `if (!JWT_SECRET) return null;` and in `lib/auth.ts` `throw new Error('JWT_SECRET required')` outside any conditional. Already enforced in `server/index.ts` startup but the lib must enforce too because it loads independently.

Issue number: Phase2.0002
Issue level: critical
Issue: `server/lib/auth.ts` lines 122–134: `verifyToken` parses `payload.exp` without type validation. `payload.exp < Math.floor(...)` returns falsy if `exp` is a string or missing → token never expires. Forged token with `exp:"never"` accepted forever.
Solution: Validate types: `if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now()/1000)) return null;` and require `payload.uid && payload.email && payload.iat` to be present.

Issue number: Phase2.0003
Issue level: critical
Issue: `server/lib/auth.ts` line 24 stores users in a flat JSON file on disk (`data/users.json`) when DATABASE_URL is unset. On Railway this filesystem is ephemeral — every redeploy wipes user accounts and password hashes. Multi-instance also corrupts data despite the write queue (no cross-process lock).
Solution: Block startup unless `DATABASE_URL` is set in production: `if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) { console.error('DATABASE_URL required in prod'); process.exit(1); }` and migrate users to Postgres `app_users` table (entity exists already).

Issue number: Phase2.0004
Issue level: high
Issue: `server/routes/auth.ts` lines 188–203: `/forgot-password` always returns success, but in non-production logs the OTP to stdout (line 200). If `NODE_ENV` is misconfigured (not literally "production"), OTPs leak to log aggregators.
Solution: Remove the `console.log` line entirely and require `process.env.SMTP_*` to be configured before the route is registered, returning `503` if email transport is missing.

Issue number: Phase2.0005
Issue level: high
Issue: `server/lib/auth.ts` line 108: PBKDF2 uses 100 000 iterations with SHA-512 — below OWASP 2023 recommendation (≥ 600 000 for SHA-256, or use Argon2id/scrypt for new systems).
Solution: Either bump iterations: `crypto.pbkdf2Sync(password, salt, 600000, 64, "sha512")`, or replace with argon2id via `node-argon2` (`argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })`). Migrate hashes lazily on next successful login.

Issue number: Phase2.0006
Issue level: high
Issue: `server/lib/auth.ts` lines 158–170: `loginUser` compares hashes with `hash !== user.passwordHash` (non-constant time string compare → timing oracle on hash bytes).
Solution: Use `crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'))` after length check.

Issue number: Phase2.0007
Issue level: high
Issue: `server/routes/auth.ts` line 145: `/login` and `/register` lack lockout after N failures (rate-limit is per-IP with `max:10`, easily bypassed via IP rotation).
Solution: Add per-email lockout: track failure count keyed by `email`, lock for 15 min after 5 failures; persist counter in Redis: `redis.incr("login_fail:" + email); redis.expire(..., 900)`.

Issue number: Phase2.0008
Issue level: high
Issue: `backend/src/main/java/com/financetracker/controller/WebAuthnController.java` line 16: `@CrossOrigin(origins = "*")` overrides the global CORS policy. Combined with credentials it would be invalid; without credentials it still permits any origin to call sensitive WebAuthn endpoints.
Solution: Remove `@CrossOrigin(origins = "*")` so the controller inherits `WebConfig` CORS, which restricts to the middleware origin only.

Issue number: Phase2.0009
Issue level: critical
Issue: `WebAuthnController.java` lines 29–37: `DELETE /api/auth/webauthn/credentials?email=...` has NO authentication check. Any unauthenticated caller can wipe ANY user's passkeys, locking them out of biometric login.
Solution: Add an authenticated guard (Spring Security or a `requireUser(@RequestHeader X-User-Id)` + assert that `userRepository.findByEmail(email).getId().equals(userId)`).

Issue number: Phase2.0010
Issue level: critical
Issue: `WebAuthnController.java` line 64: `verifyLogin` returns the full `AppUser` entity but does NOT issue a JWT cookie. The frontend (LoginPage.tsx line 53) treats this as a successful login, but no auth cookie is set → user is unauthenticated for subsequent calls. The session-bound `loginOptions` may also be null when proxied through Express (cookie/session boundary mismatch).
Solution: After `finishAuthentication`, mint a JWT via the same `createToken()` used by `/login`, set the `auth_token` cookie, and return `{ user: { uid, email, name } }`. Move the cookie issuance to the Express proxy (`server/routes/auth.ts proxyWebAuthn`).

Issue number: Phase2.0011
Issue level: high
Issue: `WebAuthnService.java` line 33: `.id("localhost")` hard-codes the WebAuthn Relying Party ID. In production this MUST be the real domain or all credentials are bound to localhost and unusable.
Solution: `@Value("${WEBAUTHN_RP_ID:localhost}") private String rpId;` then `.id(rpId)`. Set `WEBAUTHN_RP_ID=app.example.com` in production env.

Issue number: Phase2.0012
Issue level: high
Issue: `server/routes/auth.ts` line 174–186: `/me` re-reads/verifies the token directly from headers/cookies, but routes elsewhere assume `req.user` from middleware. The hand-rolled token extraction here uses `authHeader?.slice(7)` even if the header doesn't start with "Bearer " — extracts arbitrary string.
Solution: Replace the body of `/me` with `authMiddleware`, then `res.json({ user: req.user })`. Reuses the safer extraction logic.

Issue number: Phase2.0013
Issue level: medium
Issue: `server/routes/auth.ts` line 134: on `/register` no email verification before account is active. Disposable emails take up DB space and can be used for AI-quota abuse.
Solution: Add an `email_verified=false` flag on user creation and gate finance proxy on it; send a verification email on signup.

Issue number: Phase2.0014
Issue level: high
Issue: `UserSeeder.java` always seeds the dev user `yugi@finance.com` with `role: "ADMIN"` when the `dev` profile is active. If `dev` is accidentally activated in prod (env misconfig), an admin account is created with a known email and no password → trivial takeover via WebAuthn enroll.
Solution: Keep the seeder behind `@Profile("dev")` AND additionally guard with a runtime check that refuses to start if active profile is dev in production. Better: delete the seeder and require manual user creation.

Issue number: Phase2.0015
Issue level: medium
Issue: `server/lib/auth.ts` lines 211–259: parallel reset-token mechanism (`generateResetToken`, `resetPasswordWithToken`, `updatePasswordDirectly`) is dead/unused, lives only in memory, and `updatePasswordDirectly` would let any caller change any user's password if ever wired up.
Solution: Delete `generateResetToken`, `resetPasswordWithToken`, and `updatePasswordDirectly` entirely. The OTP flow in `routes/auth.ts` is the only sanctioned reset path.

Issue number: Phase3.0001
Issue level: high
Issue: `server/index.ts` lines 75–89: hand-rolled CORS does not vary `Access-Control-Allow-Origin` by request method, and on missing origin the OPTIONS preflight returns 403 without `Access-Control-Allow-*` headers — legitimate browsers receive opaque CORS errors. Also `Vary: Origin` header is missing → cache poisoning risk on shared CDNs.
Solution: Use the `cors` npm package: `app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }))` and set `Vary: Origin` automatically.

Issue number: Phase3.0002
Issue level: critical
Issue: `server/routes/finance.ts` lines 250–275: MCP SSE clients are stored in module-level `let mcpClients: any[] = []` keyed only by `Date.now()` — duplicate IDs on bursty traffic, and the `clientId` is leaked in the SSE `endpoint` event. Any user who guesses another `clientId` can `POST /api/finance/mcp/message?clientId=N` and impersonate them. The `/mcp/message` route does NOT validate that the caller's `userId` matches the SSE channel owner.
Solution: Use cryptographic IDs (`crypto.randomUUID()`), and on `/mcp/message` reject if `userId !== mcpClients.find(c => c.id === clientId)?.userId`. Better: pin the clientId to the JWT `uid` and never expose it.

Issue number: Phase3.0003
Issue level: high
Issue: `server/routes/finance.ts` line 219–230: `POST /sync-transactions` accepts an unbounded array and caches via `JSON.stringify(transactions)` into Redis with no size cap. A malicious caller fills the cache with the global 2 MB body limit per user → cache exhaustion DoS.
Solution: Add `if (transactions.length > 5000) return res.status(413).json({error:'too many transactions'})` and `if (JSON.stringify(transactions).length > 1_000_000) return res.status(413)…`. Set per-user cache size cap.

Issue number: Phase3.0004
Issue level: high
Issue: `server/routes/finance.ts` lines 277–429 — MCP `tools/call` for `update_budget` (lines 389–404) DOES strip `spent` (good), but the generic branch (lines 405–417) for other create ops sends `args` straight through (`{ ...args, userId }`). For `create_budget`, `create_savings_goal`, `create_transaction` an attacker can inject `spent`, `current`, `idempotencyKey`, etc. Backend Budget model `spent` is package-private but @Data still synthesises a public setter from Lombok → mass-assignment via JPA `save()`.
Solution: Whitelist allowed fields per tool: `const ALLOWED = { create_budget: ['category','limit','currency','periodType','periodStart','periodEnd'], … }; const safe = Object.fromEntries(Object.entries(args).filter(([k]) => ALLOWED[name].includes(k)));` and use `safe` instead of `args`.

Issue number: Phase3.0005
Issue level: high
Issue: `server/routes/finance.ts` line 44: `proxyToBackend` rejects `..` in path but `req.params.id` flows through `encodeURIComponent` and reaches Spring as a path variable. No validation of the ID shape happens at the proxy → unbounded strings, control chars, can poison Spring path matching.
Solution: Validate IDs strictly: `if (!/^[A-Za-z0-9._-]{1,100}$/.test(req.params.id)) return res.status(400).json({error:'invalid id'})` at every route that takes `:id`.

Issue number: Phase3.0006
Issue level: high
Issue: `server/routes/ai.ts` lines 350–500: AI Oracle tool-call loop runs up to `MAX_ITERATIONS=5` and each iteration may invoke `create_transaction`. There is NO confirmation step or amount cap, so the LLM (manipulated via prompt injection in `message`) can silently create transactions of any amount on the user's account.
Solution: Require explicit user confirmation before any *mutating* tool: change `create_transaction` to a "pending action" that the frontend confirms via UI. Also enforce amount cap: `if (Math.abs(args.amount) > 10000) toolResult = {error:'requires UI confirmation'}`.

Issue number: Phase3.0007
Issue level: medium
Issue: `server/routes/ai.ts` lines 156–212: `/process-input` falls back to a "mocked AI" that returns deterministic placeholder data when `NVIDIA_API_KEY` is missing — in production this would silently corrupt the user's ledger with fake `merchant: "Mocked AI Response"` entries.
Solution: Replace the mock branch with `return res.status(503).json({error:"AI not configured"})` so the frontend handles it instead of inserting garbage.

Issue number: Phase3.0008
Issue level: high
Issue: `server/routes/ai.ts` `/oracle` (line 350) and `/chat` (line 547) accept an unbounded `history` array (and `transactions` array in `/chat`) and forward them to the LLM. Token-cost / DoS attack: a 2 MB body of history blows up the prompt cost. Also no rate limit applied.
Solution: Cap aggressively: `if (history.length > 20) history = history.slice(-20)`; `if (transactions.length > 30) transactions = transactions.slice(-30)`; apply `aiLimiter` (rate-limit to 30 req/15min/uid) using `req.user.uid` as key.

Issue number: Phase3.0009
Issue level: medium
Issue: `server/routes/family.ts` lines 6–19: `GET /:id` returns a hard-coded family object regardless of whether the requesting user is a member. Any authenticated user can read any family ID; the response always shows them as Admin.
Solution: Delete this unused router or implement properly: check `familyAccountRepo.findById(id)`, verify caller is in `members[]`, reject with 403 otherwise.

Issue number: Phase3.0010
Issue level: medium
Issue: `server/routes/investment.ts` lines 30–78: GET `/stock/:symbol` is mounted at `/api/investment` in `index.ts` but lacks an `authMiddleware` — unauthenticated callers can hammer Alpha Vantage on the owner's API quota or scrape mock prices.
Solution: Add `investmentRouter.use(authMiddleware)` at the top, and apply a 30 req/min/IP rate limiter.

Issue number: Phase3.0011
Issue level: low
Issue: `server/index.ts` line 103–106: CSP is `default-src 'none'; frame-ancestors 'none'` which is fine for a JSON API, but the same server also has an SSE endpoint that requires `connect-src` — browsers block legit SSE in some configurations.
Solution: Add `connect-src 'self'` to the API server CSP and document that the frontend's CSP (Vercel) is set separately.

Issue number: Phase3.0012
Issue level: low
Issue: `server/middleware/rateLimit.ts` (homegrown) coexists with `express-rate-limit` (used in routes). The home-grown one stores buckets in an unbounded `Map<string,Bucket>` → memory leak per unique IP/UID forever.
Solution: Delete the homegrown `middleware/rateLimit.ts` and use only `express-rate-limit` everywhere; or add a `setInterval` sweep that prunes expired buckets.

Issue number: Phase3.0013
Issue level: low
Issue: `server/index.ts` line 123: body size limit `2mb` is fine for most routes but `/api/finance/sync-transactions` and `/api/ai/oracle` accept large arrays — a 2 MB JSON array is ~50 K transactions which OOMs the LLM call.
Solution: Apply per-route smaller limits using `express.json({ limit: '256kb' })` middleware mounted on noisy routes; keep 2 MB only for file analysis.

Issue number: Phase4.0001
Issue level: critical
Issue: `BankAccountController.java` line 32–34: `PUT /accounts/{id}` accepts `BankAccount updates` body and the service blindly applies `updates.getBalance()` (BankAccountService.java line 40). A user can `PUT { "balance": 999999999 }` to set arbitrary balance — defeating the entire ledger model.
Solution: Remove balance from the update path entirely. Balance is computed server-side from transactions. Replace with: `// balance is server-managed; never accept from client` and delete the `if (updates.getBalance() != null) existing.setBalance(...)` line.

Issue number: Phase4.0002
Issue level: critical
Issue: `UserProfileController.java` lines 28–33: `GET /api/finance/user-profiles/by-email/{email}` has NO auth check; the comment says "gated by middleware in production" but the Express proxy in `finance.ts` (line 183–184) does not verify ownership either. An authenticated user can enumerate every user's profile (PII: name, email, role, avatar URL, preferences JSON) by guessing emails.
Solution: In `finance.ts` proxy, check that the requested email belongs to the caller before forwarding: `if (req.params.email.toLowerCase() !== req.user.email.toLowerCase()) return res.status(403)`. Then in the Spring controller, also require `X-User-Id` and call `Guards.assertOwner(profile.getId(), userId)` after lookup.

Issue number: Phase4.0003
Issue level: high
Issue: `WebConfig.java` line 36–47: CORS allows credentials and inherits from `ALLOWED_ORIGINS` env var. Properties default at line 5 is `http://localhost:4000` (good), but when `ALLOWED_ORIGINS` env contains a wildcard or the Vercel preview URL, the backend would accept browser cross-origin calls bypassing the middleware-only contract.
Solution: Document & validate at startup that `ALLOWED_ORIGINS` only contains the middleware origin (never the frontend). Add: `if (Arrays.stream(allowedOrigins.split(",")).anyMatch(s -> s.contains(".vercel.app"))) throw new IllegalStateException("Backend CORS must not include frontend origin");`.

Issue number: Phase4.0004
Issue level: high
Issue: All Spring controllers trust `X-User-Id` header set by the proxy as the sole auth signal — there is NO JWT verification at the Spring layer. If the backend is ever exposed (Railway misconfig, public DNS, port scan), every endpoint is wide open: just set `X-User-Id: <victim>` and read all data.
Solution: Add Spring Security with a JWT filter that validates the same JWT issued by the Express middleware (`server/lib/auth.ts createToken`). Share `JWT_SECRET` env var between both services. Reject any request lacking a valid token.

Issue number: Phase4.0005
Issue level: high
Issue: `AuditLogController.java` line 31–36: defines `DELETE /audit-logs/{id}` and calls `service.delete(id, userId)` — but `AuditLogService` has NO `delete` method (the comment at line 31–33 says it was removed). This is a compile-time error and the project will not build.
Solution: Delete the `@DeleteMapping` block entirely from `AuditLogController.java` (audit logs must be append-only). Verify by running `mvn compile`.

Issue number: Phase4.0006
Issue level: medium
Issue: Several controllers mark `X-User-Id` as `required = false` and rely on `Guards.requireUser` to throw — but the GlobalExceptionHandler maps `RuntimeException` containing "not found" to 404, not 401. A missing header may surface as 500 rather than the intended 401.
Solution: Mark `X-User-Id` as `required = true` so Spring auto-rejects with 400 BAD_REQUEST; remove redundant `Guards.requireUser` calls.

Issue number: Phase4.0007
Issue level: medium
Issue: `GlobalExceptionHandler.java` line 50–63: matches "not found" anywhere in the exception message → if a developer ever writes `throw new RuntimeException("payload not found in cache")` for an internal cache miss, callers receive 404 instead of 500. Fragile.
Solution: Use typed exceptions (`EntityNotFoundException`, custom `OwnershipException`) and switch on type, not on the message string.

Issue number: Phase4.0008
Issue level: medium
Issue: `TransactionController.java` line 39–41: `update` accepts `Map<String, Object>` and `bulkUpdate` line 45 also accepts unconstrained `Map`. `applyUpdates` in the service (line 275–293) does whitelist keys, but `confidence` is in the whitelist letting a client set their own confidence (manipulating the AI feedback loop).
Solution: Remove `confidence` from accepted update keys (server should write only). Delete the `case "confidence" -> tx.setConfidence(...)` line.

Issue number: Phase4.0009
Issue level: low
Issue: `FamilyAccountController.java` line 33–38: `create` lets the client supply the full `FamilyAccount` body and only sets `ownerId` after — the client could self-grant any role in `members`.
Solution: Strip mutable nested fields from the create body — initialise `members = [{ uid: caller, role: 'ADMIN' }]` server-side and ignore any client-supplied list.

Issue number: Phase5.0001
Issue level: high
Issue: `Budget.java` uses `@Data` (Lombok) which generates a public `setSpent(BigDecimal)` setter, defeating the package-private `setSpentInternal`. Jackson can deserialize `"spent": 0` from any client PUT and Lombok's setter will be invoked during update flows that pass the body verbatim.
Solution: Replace `@Data` with `@Getter` only; manually write setters for every mutable field EXCEPT `spent`. Or annotate `private BigDecimal spent;` with `@Setter(AccessLevel.PACKAGE)` and `@JsonProperty(access = JsonProperty.Access.READ_ONLY)`.

Issue number: Phase5.0002
Issue level: high
Issue: `SavingsGoal.java` same issue as Phase5.0001 — `@Data` synthesises public `setCurrent`. The `setCurrentInternal` is bypassable via JSON deserialization since Jackson uses the public setter.
Solution: Annotate `current` field with `@JsonProperty(access = JsonProperty.Access.READ_ONLY)` and `@Setter(AccessLevel.PACKAGE)`. Verify with a unit test that `objectMapper.readValue("{\"current\":999}", SavingsGoal.class).getCurrent() == null`.

Issue number: Phase5.0003
Issue level: critical
Issue: `TransactionService.java` lines 158–193 `syncTransactions`: when a tx exists in DB and is also in the incoming feed, it's updated by directly mutating fields (`existing.setMerchant`, `setAmount`, etc.) WITHOUT calling `applyBalanceDeltaWithRetry(-1)` to remove the old delta first. The `update()` method does this correctly (lines 91–106) but `syncTransactions` does not → balances drift silently on every sync.
Solution: In `syncTransactions`, replace the `existing -> { existing.setMerchant... }` block with a call to `update(existing.getId(), Map.of("merchant", tx.getMerchant(), "amount", tx.getAmount(), ...), userId)` so the standard delta lifecycle is honoured.

Issue number: Phase5.0004
Issue level: critical
Issue: `TransactionService.java` lines 90–106 `update`: the order of `applyBalanceDeltaWithRetry(tx,-1)` → `applyUpdates` → `applyBalanceDeltaWithRetry(saved,+1)` is correct, but `applyBalanceDeltaWithRetry` is called inside `@Transactional(REPEATABLE_READ)`. A retry on `ObjectOptimisticLockingFailureException` rolls back the entire outer transaction — the budget/savings deltas already applied get redone, and the `applyUpdates` mutation is lost from the persistence context. Inconsistent end state under contention.
Solution: Move the optimistic-lock retry to the controller layer / service entrypoint so the *whole* method re-runs atomically. Catch `ObjectOptimisticLockingFailureException` at the top of `update()` (and bulk variants) and re-execute.

Issue number: Phase5.0005
Issue level: high
Issue: `TransactionService.java` line 281: `case "amount" -> tx.setAmount(new BigDecimal(value.toString()));` allows the client to update an EXPENSE to an arbitrarily huge amount with no per-transaction cap. Combined with no overdraft check, a single PUT can drive an account to extreme negative.
Solution: Validate at update: `if (newAmount.abs().compareTo(MAX_TX_AMOUNT) > 0) throw new ResponseStatusException(BAD_REQUEST, "amount exceeds limit")`. Define `MAX_TX_AMOUNT = new BigDecimal("1000000")` per currency.

Issue number: Phase5.0006
Issue level: high
Issue: `TransactionService.applyBudgetDelta` line 248: case-insensitive category compare allows merchant-supplied category to match a budget unintentionally. Currency check requires both currencies set, so a tx with no currency always matches → cross-currency double-counting possible if user has USD and EUR budgets in the same category.
Solution: Require strict normalised match: `b.getCategory().trim().equalsIgnoreCase(tx.getCategory().trim())` AND `Objects.equals(b.getCurrency(), tx.getCurrency())` (no nulls allowed); reject creating transactions without an explicit currency.

Issue number: Phase5.0007
Issue level: high
Issue: `LoanService.java` line 76–124 `generateAmortisation`: principal is read from `loan.getTotalAmount()` but the user can submit `interestRate = -100` or `tenureYears = 0` → `monthlyRate` becomes negative or `n=0`, EMI formula divides by zero or the `while` loop runs forever.
Solution: Validate inputs at controller via Bean Validation: `@DecimalMin("0.0") @DecimalMax("100.0") private BigDecimal interestRate;` and `@Min(1) @Max(50) private Integer tenureYears;` on the Loan model, and add `@Valid` to `LoanController.create/update`.

Issue number: Phase5.0008
Issue level: high
Issue: `RecurringPaymentScheduler.java` lines 38–60: idempotency key is `"rec-" + rp.getId() + "-" + today` — if the job runs twice on the same day (Railway restart, manual trigger) the unique constraint catches dup *transaction* but the `rp.setHistory(...)` and `rp.setDueDate(...)` (line 58–60) are still applied → duplicate history rows and dueDate advanced twice.
Solution: Compare returned tx ID to the one we generated; if different, the row was deduped — skip history/dueDate update. Or move history append + dueDate advance inside an explicit `if (txService.create(tx).isNew())` check.

Issue number: Phase5.0009
Issue level: medium
Issue: `BudgetRolloverScheduler.java` runs at `0 5 0 1 * *` UTC. For a user in UTC-12 (Hawaii) the budget resets while it's still the previous month locally → user appears to have a fresh budget on the last day of the month.
Solution: Roll over per-user according to their stored timezone (add `User.timezone` field). Or run the rollover at 12:00 UTC and accept the lag for non-prod simplicity, documenting it.

Issue number: Phase5.0010
Issue level: high
Issue: `InvestmentPriceRefreshScheduler.java` line 36: `@Value("${ALPHA_VANTAGE_API_KEY:demo}")` — defaults to the literal string `"demo"`, which Alpha Vantage accepts only for IBM symbol. In production with no key set, the scheduler logs errors silently and `currentPrice` is never updated → P&L always shows 0% gain.
Solution: At scheduler startup, `if ("demo".equals(apiKey)) { log.warn("Alpha Vantage demo key — disabling refresh"); return; }` and surface a health check so Ops sees it.

Issue number: Phase5.0011
Issue level: medium
Issue: `UserProfileService.purgeUserData` lines 78–95 deletes from 12+ repositories. Although annotated `@Transactional`, `auditLogService.anonymiseByUserId` is called on a different bean — propagation is REQUIRED by default, but if the audit service's tx demarcation diverges, partial deletion is possible if the DB connection drops mid-purge.
Solution: Annotate explicitly: `@Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)` on both `purgeUserData` and `anonymiseByUserId`, and add an integration test that asserts atomicity under simulated DB error.

Issue number: Phase5.0012
Issue level: medium
Issue: `Transaction.java` line 47: `private Instant createdAt = Instant.now();` is set at *Java object construction time*, not at INSERT. If a `Transaction` object is built minutes before being persisted (e.g. stuck in retry), `createdAt` is wrong.
Solution: Use `@CreationTimestamp` from Hibernate or set in `@PrePersist` callback: `@PrePersist void onCreate() { this.createdAt = Instant.now(); }`. Remove the field initializer.

Issue number: Phase5.0013
Issue level: high
Issue: `BankAccountService.create` line 24: `account.setId("acc-" + System.currentTimeMillis())` — millisecond timestamps collide under load (two accounts created in same ms) → DB integrity violation. UUID is used everywhere else; this is the only outlier.
Solution: `account.setId("acc-" + UUID.randomUUID());`.

Issue number: Phase5.0014
Issue level: medium
Issue: `Investment.java` model: `currentPrice` is server-managed but uses `@Data` — same Lombok mass-assignment risk as Phase5.0001.
Solution: Same fix — `@JsonProperty(access = READ_ONLY)` on `currentPrice` and `@Setter(AccessLevel.PACKAGE)` so only the scheduler can write it.

Issue number: Phase5.0015
Issue level: low
Issue: `TransactionService.applySavingsDelta` lines 263–273: does not respect the goal's currency — a USD goal contributing an EUR transaction adds raw EUR amount as if it were USD. Cross-currency contamination of progress.
Solution: Skip if `goal.getCurrency() != null && tx.getCurrency() != null && !goal.getCurrency().equalsIgnoreCase(tx.getCurrency())`. Mirror the Budget logic.

Issue number: Phase6.0001
Issue level: high
Issue: `packages/frontend/src/components/AIInsightsPage.tsx` line 44 + `AIOracle.tsx` line 23: AI chat history is persisted in `localStorage` keyed by hard-coded names with no per-user namespacing. Logging out and logging in as another user on the same device exposes the previous user's chat (which contains transaction summaries / financial PII).
Solution: Namespace by user: `localStorage.getItem('ft_oracle_messages_' + userProfile.uid)`; on logout, clear all `ft_*` keys (`Object.keys(localStorage).filter(k=>k.startsWith('ft_')).forEach(k=>localStorage.removeItem(k))`).

Issue number: Phase6.0002
Issue level: high
Issue: `packages/frontend/src/services/api.ts` line 7–17: `getMiddlewareBase()` falls back to `window.location.origin` if `VITE_MIDDLEWARE_URL` is unset — silently sending finance API calls to whatever site happens to host the bundle. Auto-prepends `https://` to bare hostnames without validation → typosquat-friendly.
Solution: Hard-fail at bundle build if `VITE_MIDDLEWARE_URL` is missing in production: in `vite.config.ts` add `if (mode==='production' && !env.VITE_MIDDLEWARE_URL) throw new Error('VITE_MIDDLEWARE_URL required')`. Validate URL via `new URL(url)` and require https in prod.

Issue number: Phase6.0003
Issue level: medium
Issue: `LoginPage.tsx` line 53: after WebAuthn `verifyRes.json()` returns the AppUser, the frontend calls `onLogin(userProfile.email)` with no token check. Combined with Phase2.0010 (no JWT issued), the user appears logged in but every subsequent request fails with 401 — users see broken UI with no clear error.
Solution: After WebAuthn verify, hit `/api/auth/me` to confirm a valid auth cookie is set; if not, throw "Biometric login server-side incomplete" and surface the error.

Issue number: Phase6.0004
Issue level: medium
Issue: `packages/frontend/src/services/api.ts` line 38–47: error path swallows all non-OK responses into a generic `Error(message)` — including 401s, which should bubble up to a global "session expired → redirect to login" handler. Currently each component must handle 401 individually and most don't.
Solution: Add a global response interceptor: `if (res.status === 401) { window.dispatchEvent(new CustomEvent('auth:expired')); throw new Error('Session expired'); }`. Subscribe in App.tsx to redirect to `/login`.

Issue number: Phase6.0005
Issue level: low
Issue: `SignupPage.tsx` line 78–80 has hidden honeypot inputs `<input type="text" style="display:none">` to fool autofill, but the real `name` field uses `autoComplete="off"` and `readOnly={!isReady}` patterns that hurt accessibility (screen readers, password managers) and provide no real security.
Solution: Drop the readOnly/onFocus tricks and the honeypots; rely on `autocomplete="email"`, `autocomplete="new-password"` etc. as the spec requires.

Issue number: Phase6.0006
Issue level: medium
Issue: `packages/frontend/src/services/mcpClient.ts` line 16: `EventSource(this.sseUrl, { withCredentials: true })` includes cookies in the SSE stream. The endpoint URL returned by the server (line 19) is then used for POSTs — but the SSE is open as long as the page is open → leaks long-running session. No reconnect-with-backoff logic, just `console.warn`.
Solution: Add explicit reconnect with exponential backoff and a TTL on the SSE channel (server closes after 30 min), document that the session is transient and forces re-auth on reconnect.

Issue number: Phase6.0007
Issue level: low
Issue: Multiple `console.log` calls left in shipped frontend code (`mcpClient.ts` lines 15, 20; many components). CLAUDE.md forbids `console.log` in committed code.
Solution: Add ESLint rule `"no-console": ["error", { allow: ["error", "warn"] }]` and run `npm run lint --fix`. Keep only `console.error` for caught errors.

Issue number: Phase7.0001
Issue level: high
Issue: Bulk transaction operations (`bulkUpdate`/`bulkDelete` in TransactionService) iterate per-tx and call `applyBalanceDeltaWithRetry` for each one inside a single `@Transactional` — Hibernate's first-level cache returns the same `BankAccount` instance with the cached `version`. After the first save the version is bumped in cache; subsequent saves can silently re-write or throw. Also retries multiply with 100+ transactions and timeouts cascade.
Solution: Compute net delta per `(account, sign)` pair in a Map, then apply once at the end: `Map<String, BigDecimal> netDeltas = ...; for (entry : netDeltas) { applyBalanceDeltaWithRetry(account, entry.getValue()) }`.

Issue number: Phase7.0002
Issue level: high
Issue: `TransactionService.create` handles `DataIntegrityViolationException` for idempotency dedup (line 82–86), but the duplicate detection relies on the *client* supplying the same idempotency key on retry. The proxy at `finance.ts:99` only generates a key if the client header is missing → first POST may have no key (proxy generates UUID-A), retry has no key (proxy generates UUID-B) → two different UUIDs → two transactions.
Solution: Generate idempotency key on the *frontend* before POST, persist to localStorage until 2xx response received, retry with same key. Add this to `services/api.ts createTransaction` and require the header at the proxy.

Issue number: Phase7.0003
Issue level: medium
Issue: `RecurringPaymentScheduler` creates transactions with `category: rp.getCategory()` but if that category does not match an existing budget, no budget delta is applied — recurring expenses can silently overrun budgets without warning.
Solution: Either auto-create a "Subscriptions" budget bucket for unmatched recurring payments, or fire an audit event when a recurring payment fires against a category that has no budget for the current period.

Issue number: Phase7.0004
Issue level: medium
Issue: No reconciliation job exists. If `applyBudgetDelta` fails partway (e.g. DB lock timeout) the budget `spent` drifts from the actual sum-of-transactions forever.
Solution: Add a daily `BudgetReconciliationScheduler` that recomputes `spent` from `SELECT SUM(amount) FROM transactions WHERE category=? AND user_id=? AND date BETWEEN ? AND ?` and overwrites the cached `spent` value with `setSpentInternal`.

Issue number: Phase7.0005
Issue level: high
Issue: `applyBalanceDelta` (line 216–236) silently skips when account is not found (`optBank.ifPresent`) — a transaction can be created against a typo'd account name and the balance never updates, but the tx persists and budget/savings deltas DO apply → ledger is internally inconsistent.
Solution: If account is non-blank but not found, throw `ResponseStatusException(BAD_REQUEST, "account not found")` to roll back the entire tx instead of silent skip.

Issue number: Phase7.0006
Issue level: high
Issue: `RecurringPaymentScheduler` fires an `EXPENSE` transaction even when the linked bank account has insufficient balance — no overdraft / available-balance check. Real banks would reject. Users see negative balances they don't expect.
Solution: Before `txService.create(tx)`, check `bankRepo.findByName(rp.getPaymentMethod()).getBalance().compareTo(rp.getAmount()) >= 0`; if insufficient, mark `rp.setStatus("FAILED_INSUFFICIENT_FUNDS")` and emit notification instead of creating the tx.

Issue number: Phase8.0001
Issue level: high
Issue: `server/test/api.test.ts` only covers in-memory data structure manipulation (`.filter`, `.map`) — no integration tests against actual Express routes, no auth tests, no race-condition tests for balance deltas. Test coverage is essentially zero for production code paths.
Solution: Add Supertest-based integration tests: spin up the Express app with `app.listen(0)`, mock the Spring backend with `nock`, exercise auth flows, transaction create with idempotency, sync-transactions, MCP SSE. Aim for ≥70% coverage on `server/routes/*`.

Issue number: Phase8.0002
Issue level: medium
Issue: No Java backend tests exist (`backend/src/test/` directory is missing or empty per file listing). Critical money-mutating logic in `TransactionService.applyBalanceDelta`, `LoanService.generateAmortisation`, `BudgetRolloverScheduler.rolloverBudgets` is untested.
Solution: Add JUnit + Spring Boot Test slices: `@DataJpaTest` for repositories, `@SpringBootTest` for service-level money math. Required scenarios: idempotency, optimistic-lock retry, cross-currency budget skip, zero-interest amortisation, rollover at month boundary.

Issue number: Phase8.0003
Issue level: medium
Issue: Server logs every request line including path with query string (`server/index.ts` line 116). For routes like `/api/auth/webauthn/credentials?email=victim@example.com` this leaks user emails to log aggregators.
Solution: Strip query strings from the log line: `console.log(...res.statusCode + " " + req.path)` — already does (uses `req.path`), but the WebAuthn DELETE endpoint takes `email` in the query. Ensure no log middleware logs `req.url` (which includes query). Add a redaction regex for `email=`, `token=`.

Issue number: Phase8.0004
Issue level: medium
Issue: No structured logging — all output is `console.log` plain text. Production observability (Datadog/Logtail) requires JSON logs with correlation IDs. The Spring backend uses Slf4j (good) but the Express middleware does not.
Solution: Replace `console.*` with `pino` (`import pino from 'pino'; const log = pino()`); attach a request ID via `req.headers['x-request-id'] || crypto.randomUUID()` and propagate to Spring via `X-Request-Id` header.

Issue number: Phase8.0005
Issue level: low
Issue: No alerts / monitoring on critical schedulers (recurring payments, budget rollover, price refresh). If one job fails for a week, no one knows until users notice.
Solution: After each scheduler run, write a heartbeat row to a `scheduler_runs` table with `(job_name, last_success_at, last_error)`. Add `/api/health` check that returns "degraded" if any heartbeat is older than 2× its expected interval.

Issue number: Phase8.0006
Issue level: high
Issue: PII storage of password hashes / OTPs / financial data lacks at-rest encryption beyond Postgres' default. There is NO field-level encryption for sensitive columns (e.g. `bank_accounts.card_number_last4`, `transactions.merchant`, `user_profiles.preferences`).
Solution: Use `@Convert(converter = AesEncryptedConverter.class)` on PII columns; key from `${PII_ENCRYPTION_KEY}` env (rotated quarterly). At minimum, encrypt `card_number_last4`, account names if they contain real account numbers, and the audit log `details` JSON.

Issue number: Phase8.0007
Issue level: medium
Issue: No CSRF protection on state-changing endpoints. Despite `SameSite=strict` cookies (good), this is browser-dependent; older Safari leaks cookies on top-level cross-site POSTs (Lax behaviour). For finance app, defence in depth is required.
Solution: Issue a double-submit CSRF token on `/api/auth/me` response, require it as `X-CSRF-Token` header on every mutating finance call. Express middleware compares to the cookie copy.

Issue number: Phase8.0008
Issue level: medium
Issue: Unimplemented features advertised in `CLAUDE.md` but missing in code: email delivery for OTP (only logged), MFA enrollment beyond passkey, account lockout after failed logins, transaction export to CSV/PDF for tax season, automated backups.
Solution: Track these as production blockers: SES/SendGrid integration for `forgot-password`, account-lockout in Redis, CSV export in `/api/finance/transactions/export`, daily logical backup of `finance_app` schema to S3 with retention.

</issues>

---

## Memory hint for batched fixes

Reference any issue by its `PhaseX.000Y` ID. The author has cached file content per phase — re-reads should be unnecessary. Highest-severity items to fix first: Phase1.0001, Phase2.0001, Phase2.0002, Phase2.0003, Phase2.0009, Phase2.0010, Phase3.0002, Phase4.0001, Phase4.0002, Phase4.0005, Phase5.0003, Phase5.0004.
