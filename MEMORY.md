# FinanceTracker — Code Memory Index

Auto-compacted. Read this before touching any file. Update after every change.

## Key File Locations
| What | Path |
|---|---|
| Auth logic | `server/routes/auth.ts` |
| AI routes | `server/routes/ai.ts` |
| Finance proxy | `server/routes/finance.ts` |
| Family route | `server/routes/family.ts` |
| Context (all state) | `packages/frontend/src/context/FinanceContext.tsx` |
| API service | `packages/frontend/src/services/api.ts` |
| AI service | `packages/frontend/src/services/aiService.ts` |
| Investment service | `packages/frontend/src/services/investmentService.ts` |
| App shell + routing | `packages/frontend/src/App.tsx` |
| Entry point | `packages/frontend/src/main.tsx` |
| All TS types | `packages/frontend/src/types.ts` |
| ErrorBoundary component | `packages/frontend/src/components/ErrorBoundary.tsx` |

## Session 4 (2026-04-24) — per-item classification + primary-per-currency + grounded AI
- `/process-input`: explicit EN income/expense lexicon (salary, paycheck, refund, credit, bonus, deposit, reimbursement, dividend, cashback, … vs bought/paid/spent/rent/bill). Classifies EACH item independently — mixed income+expense batches no longer forced to one type. Account resolution priority: named → primary-of-ccy → any-of-ccy → overall PRIMARY → any.
- `/analyze-file`: identical priority ladder; receipts with credits get `income` type.
- `/insights`, `/chat`, `/tax-suggestions`: now receive a compact tsv digest (date,merchant,signedAmount,type,account,ccy,category) instead of full JSON — major token cut. Grounded with "use ONLY provided data, never invent, treat currencies independently, never convert".
- Client `addTransactions` + `analyzeFile`: preflight guards throw `NO_ACCOUNTS` / `NO_PRIMARY` with `.code`. Resolver honours primary-of-currency before falling back.
- `SmartAdd.tsx`: catches NO_ACCOUNTS/NO_PRIMARY, shows modal with "Go to Bank Accounts" that routes via `setActiveTab('accounts')`.

## Session 3 (2026-04-24) — AI NLP + currency fixes
- `server/routes/ai.ts` /process-input: `accounts` was undefined (crash). Now accepts `accounts` in body, compact prompt (name|bank|ccy|PRIMARY), currency defaults to matched account's currency (never forced INR), multi-account inputs split correctly.
- `/analyze-file` (receipts/statements): accepts `accounts`, returns `currency` + `account`; resolves target account by name/bank/currency cue → primary fallback.
- `/oracle`: replaced broken `genAI.models.startChat` with `generateContent` + manual function-call loop (guard=6). System instruction now carries accounts (name|bank|ccy|PRIMARY). `create_transaction` schema requires `account` + `currency`; amount signed server-side.
- `/tax-suggestions`: switched from `result.response.text()` (crashed) to `result.text`; model aligned to `gemini-2.5-flash-lite`.
- `services/api.ts`: `processAIInput` + `analyzeAIFile` now accept accounts context.
- `FinanceContext.addTransactions` & `analyzeFile`: fallback is user's `isPrimary` account (not literal string `"Main Current"`); account matched by id for balance update; currency pulled from matched account when AI omits.
- `SmartAdd.tsx`: voice now continuous + interimResults; toggle mic button; stop phrases ("stop listening", "that's all", "submit now", "process entry") cleanly finalise and submit; placeholder shows multi-currency multi-account examples.

## All Issues Status (as of 2026-04-24, Session 2)

### ✅ Fixed Session 1
- ISSUE-001 thru 016, 019, 022–025, A3(inline in main.tsx), A9(CSV), A10(AI chat history), U-10(notif persistence)

### ✅ Fixed Session 2 (this session)
- A1: Deleted TopBar.tsx (was unused dead code)
- A3: Created proper `ErrorBoundary.tsx` component with styled fallback UI
- A4: App.tsx wraps with `<ErrorBoundary>`, fixed ease to `ease-in-out`, notification persistence uses `yugi_notifications` key
- A5: Created `server/routes/family.ts`
- A6: Registered `familyRouter` at `/api/family` in `server/index.ts`
- A8: No `|| -10` found in codebase (already clean)
- A11: `FamilyAccount` interface confirmed in `types.ts:165`
- A12: ForecastingPage YAxis uses full currency symbol map `{ INR:'₹', EUR:'€', USD:'$', GBP:'£' }`
- B1: TaxEnginePage hero cards use real computed values (`estimatedTaxLiability`, `potentialSavings`, `effectiveRate`)
- B2: ForecastingPage — freedom goal shows real `freedomProgress`, `freedomDate`; sliders for inflation/market return are functional `<input type="range">`
- B3: HealthScorePage — "+2% vs last month" replaced with real delta computed from `transactions`
- B4: ReportBuilderPage — all 4 widget types (bar/pie/line/table) render real recharts with real transaction data
- B5: TaxEnginePage "Learn How" accordion shows numbered steps from AI `steps[]` array; Gemini prompt updated to return `steps`
- B6: FamilyPage — "Share Code" button + invite code panel with clipboard copy; code = `FAM-${id.slice(-6)}`

### ⚠️ Known Accepted Trade-offs
- ISSUE-009: TopBar.tsx DELETED (A1 done)
- ISSUE-018: Tax engine — AI suggestions adapt to user currency; breakdown labels are generic (Federal/State/Social Security) which is US-centric but adapts amounts
- ISSUE-012: refreshData empty deps — intentional, comment explains it
- ISSUE-020: Dual activeTab state — low risk, same-frame sync
- ISSUE-A2: Email-keyed localStorage — no migration on email change
- U-05: Tax jurisdiction — India threshold ($50k exemption) + US-style labels; multi-jurisdiction requires real tax API
- U-06: Family sync — server returns stub; real multi-user sync requires DB persistence
- U-08: Bank import — manual only; requires Plaid/TrueLayer
- main.tsx: Also has inline ErrorBoundary (duplicate) — safe to remove inline one if desired

## Architecture Reminders
- Frontend → Node middleware (port 4000) → Spring Boot (port 8081)
- Auth token in `localStorage['auth_token']`
- Session: `localStorage['yugi_finance_session']`
- User data: `localStorage['yugi_finance_data_${email}']`
- Notifications: `localStorage['yugi_notifications']`
- AI chat: `localStorage['yugi_ai_chat_history']`
- Gemini model: always `gemini-2.0-flash`
- All AI calls: server-side only via `server/routes/ai.ts`
