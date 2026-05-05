# FinanceTracker Comprehensive Audit Report

## 1. TypeScript Compilation Errors (Frontend)

1. **ErrorBoundary.tsx**:
   - `Property 'state' does not exist on type 'ErrorBoundary'`: The class component `ErrorBoundary` is declared incorrectly in `src/main.tsx` and exported from `src/components/ErrorBoundary.tsx`. The type parameters are missing or incorrect.
   - `Property 'props' does not exist on type 'ErrorBoundary'`: Similar to the state issue, the props are not typed correctly for the React Component.
   - `Property 'setState' does not exist on type 'ErrorBoundary'`: Component inheritance issue.

2. **main.tsx**:
   - Contains a duplicate definition of `ErrorBoundary` class which also has TypeScript errors (`state`, `props` missing).

3. **SpendingTrends.tsx**:
   - `Type 'unknown' cannot be used as an index type`: `currencies` is typed as `unknown[]` because `Array.from(new Set(...))` infers `unknown[]` in some TS configs without explicit typing. Needs to be explicitly typed as `string[]`.

4. **FinanceContext.tsx**:
   - Multiple `Type 'unknown' cannot be used as an index type` errors for the same reason: `Array.from(new Set(...))` creating `unknown[]` arrays for `currencies`.
   - `Object literal may only specify known properties, and 'period' does not exist in type 'Partial<Budget>'`: The `createBudget` call in `FinanceContext.tsx` includes a `period: 'Monthly'` field which is not defined in the `Budget` interface in `types.ts`.

## 2. Unfinished Features & Bugs (Frontend)

1. **NetWorth Fallback Bug (`|| -10`)**:
   - Mentioned in `issues.md` (A8). The fallback `|| -10` exists in calculations and causes corruption. Need to search and replace with `|| 0`. Found in `FinanceContext.tsx` and possibly other files.

2. **Family Invite Code UI**:
   - `FamilyPage.tsx` has state for `showInviteCode` and `copyInviteCode` function, but the UI to display the code is commented out or missing from the main render tree according to `issues.md` (B6).

3. **Tax Engine Steps Accordion**:
   - `TaxEnginePage.tsx` needs to display actionable steps from AI suggestions instead of just repeating the description.

4. **Health Score Monthly Delta**:
   - `HealthScorePage.tsx` needs to show real monthly delta instead of mock data.

5. **Report Builder CSV Export**:
   - The CSV export function in `ReportBuilderPage.tsx` exists but might need validation.

6. **Carbon Footprint Disclaimer**:
   - Needs a proper disclaimer that figures are estimates based on spend amounts.

7. **Reset Password Flow**:
   - `ResetPasswordPage.tsx` sends `{ token, newPassword }` to the backend.
   - However, the backend route `/api/auth/reset-password` expects `{ email, otp, newPassword }`.
   - This is a critical mismatch. The frontend flow was changed to use a token link, but the backend still uses the OTP email flow.

8. **AI Insights Chat History Persistence**:
   - `AIInsightsPage.tsx` uses `localStorage` for chat history.

9. **App.tsx Notifications Persistence**:
   - Uses `localStorage` instead of `safeStorage`.

## 3. Security & Architecture Issues (Backend)

1. **JWT Secret Handling**:
   - `lib/auth.ts` has `const JWT_SECRET = process.env.JWT_SECRET;` and logs a warning if missing, but doesn't strictly fail fast. `createToken` throws if missing, but it should be strictly validated at startup.

2. **Exposed API Keys**:
   - `server/.env.example` contains a real Gemini API key (`GEMINI_API_KEY=AIzaSy...`). This needs to be redacted.
   - `server/scratch/test_key.ts` contains a real API key.

3. **OTP Logging in Production**:
   - The `/api/auth/forgot-password` route logs the OTP to the console in development mode, but the comment says "REMOVE IN PROD". It's wrapped in `if (process.env.NODE_ENV !== "production")`, which is acceptable but should be noted.

4. **Change Password Endpoint**:
   - The `/api/auth/change-password` endpoint uses `sensitiveLimiter` which is good, but the frontend `SettingsPage.tsx` calls it without passing the `email` if the backend expected it, but the backend extracts it from the JWT payload.

5. **Rate Limiting**:
   - Implemented via `express-rate-limit` but relies on `req.ip`. If behind a proxy (like Railway), `trust proxy` must be set correctly. It is set in `index.ts` (`app.set("trust proxy", 1);`), which is good.

6. **WebAuthn Proxy**:
   - The WebAuthn routes proxy to a Java backend. If the Java backend is not running, passkey authentication fails gracefully.

## 4. Required Fixes Summary

1. **TypeScript Fixes**:
   - Fix `ErrorBoundary` typing in both `src/components/ErrorBoundary.tsx` and `src/main.tsx`.
   - Explicitly type `currencies` as `string[]` in `SpendingTrends.tsx` and `FinanceContext.tsx`.
   - Remove `period` from `createBudget` call in `FinanceContext.tsx` or add it to the `Budget` interface.

2. **Frontend Bugs**:
   - Replace `|| -10` with `|| 0` across the codebase.
   - Implement the Family Invite Code UI in `FamilyPage.tsx`.
   - Update `TaxEnginePage.tsx` to use the `steps` array in the accordion.
   - Fix the Reset Password flow mismatch between frontend and backend.

3. **Security Fixes**:
   - Remove exposed API keys from `.env.example` and `scratch/test_key.ts`.
   - Ensure all `localStorage` calls use the `safeStorage` wrapper.
