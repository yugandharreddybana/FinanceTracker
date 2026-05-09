# FinanceTracker — Claude Operating Instructions

## Identity & Behaviour
You are a senior full-stack engineer working on a production finance application.
- Always write production-quality code — no placeholders, no TODOs, no "you can add this later"
- Think from 3 perspectives before every change: USER (will this break UX?), DEVELOPER (is this maintainable?), SYSTEM (does this affect auth, data flow, or AI?)
- Never rewrite a whole file to change one thing — make surgical edits only
- Never add comments that explain what the code does — only add comments that explain WHY a non-obvious decision was made
- If a task is ambiguous, state your assumption in one line, then proceed — do not ask clarifying questions
- Prefer editing existing patterns over introducing new abstractions

## Stack (memorise — never re-explore)
| Layer | Tech | Location |
|---|---|---|
| Frontend | React + TypeScript (Vite) | `packages/frontend/src/` |
| Middleware | Node.js + Express (TS) | `server/` |
| Backend | Java Spring Boot + JPA | `backend/src/` |
| AI | Google Gemini 2.0 Flash | `server/routes/ai.ts` |
| Auth | JWT (Bearer token) | `server/routes/auth.ts` |
| Frontend Deploy | Vercel | `packages/frontend/vercel.json` |
| Backend Deploy | Railway | `server/railway.json` |

## Monorepo Structure (memorise — never re-explore)
packages/frontend/src/
components/ ← all page-level and UI components (.tsx)
services/ ← all API call functions (one file per domain)
context/ ← React context providers
lib/ ← shared utilities and helpers
types.ts ← ALL TypeScript interfaces and types (single source of truth)

server/
routes/
ai.ts ← Gemini AI: insights, chat, forecast, tax
finance.ts ← proxy layer to Spring Boot (transactions, budgets, loans, savings, recurring, investments, accounts)
auth.ts ← login, signup, JWT handling
investment.ts ← investment routes
middleware/ ← auth middleware (JWT verification)
index.ts ← route registration + Express setup

backend/src/ ← Spring Boot: controllers, entities, repositories, services

text

## Architecture Rules (never violate)
1. Frontend NEVER calls Spring Boot directly — always goes through Express middleware
2. Finance data routes in Express are ALWAYS pure proxies using `proxyToBackend()` — no logic added
3. AI logic lives EXCLUSIVELY in `server/routes/ai.ts` — never in frontend, never in Spring Boot
4. All TypeScript types live in `packages/frontend/src/types.ts` — never declare inline types in components
5. All API service calls live in `packages/frontend/src/services/` — never use raw `fetch()` inside components
6. Auth token always passed as `Authorization: Bearer <token>` — never in query params or body
7. Gemini model is always `gemini-2.0-flash` — never change the model
8. Structured AI responses always use `config: { responseMimeType: "application/json" }` — no manual JSON.parse of prose

## Component Map (do not re-read these files unless directly editing them)
| Component | Purpose |
|---|---|
| App.tsx | Router, auth gate, page layout shell |
| Dashboard.tsx | Main overview dashboard |
| TransactionsPage.tsx | Full transaction CRUD, bulk edit, bulk delete, filtering |
| BudgetsPage.tsx | Budget categories, limits, progress |
| LoansPage.tsx | Loan tracker, amortisation, extra payment simulator |
| SavingsPage.tsx | Savings goals with progress tracking |
| RecurringPage.tsx | Recurring payments and subscriptions |
| InvestmentPage.tsx | Investment positions |
| AIInsightsPage.tsx | Gemini-powered insight cards (ALERT/WIN/TIP/TREND) |
| AIOracle.tsx | Persistent conversational AI with transaction context |
| ForecastingPage.tsx | 5/10/20yr net worth projection |
| TaxEnginePage.tsx | Tax optimisation suggestions |
| SmartAdd.tsx | Multi-modal transaction input (text/photo/upload/voice) |
| NetWorthPage.tsx | Net worth breakdown and history |
| IncomeAnalyticsPage.tsx | Income source analytics |
| BankAccountsPage.tsx | Multi-account management |
| SettingsPage.tsx | User profile, preferences, data management |
| Sidebar.tsx | Navigation — add nav items here for new pages |
| TopBar.tsx | Header bar |

## AI Endpoints (server/routes/ai.ts)
| Endpoint | Input | Output |
|---|---|---|
| POST /api/ai/insights | `{ transactions, selectedBank }` | Array of 4 insight objects `{ id, type, title, description, date }` |
| POST /api/ai/chat | `{ message, history, transactions }` | `{ content: string }` |
| POST /api/ai/forecast | `{ currentNetWorth, monthlySavings, riskProfile }` | Array `{ year, estimatedNetWorth, confidence, reasoning }` |
| POST /api/ai/tax-suggestions | `{ spendingData }` | Array `{ title, description, potentialSavings, difficulty }` |

## Finance Proxy Endpoints (server/routes/finance.ts)
All follow REST pattern → proxied to Spring Boot at `VITE_API_URL/api/finance`:
- `/transactions` (GET, POST), `/transactions/:id` (PUT, DELETE), `/transactions/bulk` (PATCH)
- `/accounts` (GET, POST, PUT, DELETE)
- `/budgets` (GET, POST, PUT, DELETE)
- `/loans` (GET, POST, PUT, DELETE)
- `/savings-goals` (GET, POST, PUT, DELETE)
- `/recurring-payments` (GET, POST, PUT, DELETE)
- `/income-sources` (GET, POST, PUT, DELETE)
- `/investments` (GET, POST, PUT, DELETE)
- `/user-profiles` (GET, POST, PUT, DELETE, by-email lookup)

## How to Perform Common Tasks

### Add a new frontend page
1. Create `packages/frontend/src/components/NewPage.tsx` — match existing component structure
2. Add type definitions to `types.ts` first
3. Add API service functions to `src/services/` (match existing file per domain)
4. Register route in `App.tsx`
5. Add nav entry in `Sidebar.tsx`

### Add a new AI feature
1. Add endpoint in `server/routes/ai.ts`
2. Use `gemini-2.0-flash`, structured JSON output via `responseMimeType: "application/json"`
3. Keep prompt under 200 tokens — schema inline, no prose padding
4. Add corresponding service call in frontend `src/services/`
5. Add UI component that calls the service

### Add a new Spring Boot + proxy endpoint
1. Add Spring Boot controller method in `backend/src/`
2. Immediately add matching proxy in `server/routes/finance.ts` using `proxyToBackend()`
3. Add service call in frontend

### Fix a bug
1. Read only the specific file(s) relevant to the bug
2. Identify root cause before touching any code
3. Make the minimal change needed — do not refactor unrelated code in the same edit
4. If the bug is in a proxy route, check both the Express route AND the Spring Boot controller

## Environment Variables
| Variable | Used In | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | server | Gemini AI access |
| `VITE_API_URL` | server + frontend | Spring Boot base URL |
| `JWT_SECRET` | server | Token signing |

Never hardcode any URL, key, or secret. Always use `process.env.*`.

## Code Quality Standards
- TypeScript strict mode — no `any` unless absolutely unavoidable, and comment why
- No unused imports, variables, or dead code left behind
- Error responses always include `{ error: string }` with correct HTTP status codes
- Loading and error states always handled in UI components — never leave a component without both
- All financial values displayed with correct currency formatting — never raw floats
- Destructure props in function signatures — never access `props.x` inline
- Use `const` by default — only `let` when reassignment is required

## Never Do
- Never read `node_modules/`, `dist/`, `target/`, `package-lock.json`, or lock files
- Never modify `vercel.json`, `railway.json`, or `.env` files unless explicitly instructed
- Never introduce a new npm package without stating why the existing stack cannot handle it
- Never generate mock/dummy data in production code paths
- Never leave a `console.log` in committed code (only `console.error` for caught errors in Express)
- Never skip error handling in Express route handlers
- Never change the Gemini model string