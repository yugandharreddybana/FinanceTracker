# Cortex Finance Tracker

A full-stack personal finance management application with AI-powered insights, multi-currency support, and comprehensive budget tracking.

---

## What It Does

- **Track transactions** — add, edit, bulk-delete, and AI-categorize spending
- **Bank accounts** — manage multiple accounts across currencies
- **Budgets & goals** — set budgets by category and savings goals with progress tracking
- **Investments, loans, recurring payments** — full coverage of your financial picture
- **AI insights** — Gemini-powered transaction categorization and spending analysis
- **Audit log** — every action is recorded with timestamps
- **Family accounts** — share budgets and accounts with family members
- **Dark-mode UI** with real-time currency conversion

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  React Frontend │────▶│  Node Middleware  │────▶│  Spring Boot Backend │
│  (Vite + TS)    │     │  (Express + JWT)  │     │  (Java 17 + JPA)     │
│  port 5173      │     │  port 4000        │     │  port 8080           │
└─────────────────┘     └──────────────────┘     └──────────────────────┘
                                                           │
                                                  ┌────────▼─────────┐
                                                  │   PostgreSQL      │
                                                  │   (Supabase)      │
                                                  └──────────────────┘
```

The middleware handles authentication (JWT, file-based user store) and proxies all finance requests to Spring Boot, injecting the user ID from the token into every request.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17+
- Maven 3.8+
- PostgreSQL database (or a [Supabase](https://supabase.com) project)

### 1. Clone and install

```bash
git clone <repo-url>
cd finance-tracker
npm install
```

### 2. Configure environment

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `JWT_SECRET` | 64-character random string for token signing |
| `GEMINI_API_KEY` | Google Gemini API key (for AI features) |
| `JAVA_BACKEND_URL` | Spring Boot URL — default `http://localhost:8080` |
| `VITE_MIDDLEWARE_URL` | Middleware URL — default `http://localhost:4000` |
| `DB_URL` | JDBC URL, e.g. `jdbc:postgresql://host:5432/postgres` |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |

### 3. Start development

```bash
# Frontend + middleware (most common)
npm run dev

# All three layers including Spring Boot
npm run dev:full
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Middleware | http://localhost:4000 |
| Spring Boot | http://localhost:8080 |

---

## Creating Your Account

1. Open http://localhost:5173
2. Click **Join the Future** on the landing page
3. Enter your name, email, and a password (min 8 characters)
4. You'll be taken directly to your dashboard — no email verification required

### Logging In

1. Click **Sign In** on the landing page
2. Enter your email and password
3. Sessions expire after **1 hour of inactivity**

### Deleting Your Account

Go to **Settings → Account → Delete Entire Account**. Type `DELETE` to confirm. This permanently removes your profile, all transactions, bank accounts, budgets, savings goals, loans, investments, and recurring payments from the database.

---

## Key Features

### Transactions
- Add transactions manually or via AI natural-language input ("spent $50 on groceries")
- Upload bank statements (PDF/CSV) for automatic parsing
- Bulk select, categorize, and delete
- Filter by date, category, account, and type

### Budgets
- Set monthly spending limits by category
- Visual progress bars update in real-time as you spend

### Savings Goals
- Create goals with target amounts and dates
- Transfer from bank accounts to fund goals

### Recurring Payments
- Track subscriptions and regular bills
- See what's due this month at a glance

### AI Features
- Auto-categorize uncategorized transactions (requires Gemini API key)
- Get spending insights and alerts based on your patterns
- Natural-language transaction entry

### Multi-Currency
- All entities support a `currency` field
- Dashboard aggregates net worth per currency

---

## Project Structure

```
finance-tracker/
├── packages/frontend/       # React + Vite + Tailwind frontend
│   └── src/
│       ├── components/      # Page and UI components
│       ├── context/         # FinanceContext (global state)
│       ├── services/        # API client, AI service, currency
│       └── types/           # TypeScript types
├── server/                  # Node.js Express middleware
│   ├── routes/              # auth.ts, finance.ts (proxy routes)
│   ├── lib/                 # auth.ts (JWT + file-based user store)
│   └── middleware/          # authMiddleware
└── backend/                 # Spring Boot Java 17 API
    └── src/main/java/com/financetracker/
        ├── controller/      # REST endpoints
        ├── service/         # Business logic + cascade delete
        ├── repository/      # JPA repositories
        ├── model/           # JPA entities
        └── config/          # CORS, WebAuthn, DB indexes
```

---

## Deployment

### Spring Boot (backend)

The backend requires **Java 17** and a PostgreSQL database. Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` as environment variables. The schema is auto-created by Hibernate on first start.

```bash
cd backend
mvn clean install -DskipTests
java -jar target/finance-tracker-backend-1.0.0.jar
```

### Node Middleware

```bash
cd server
npm run build
npm run start
```

### Frontend

```bash
cd packages/frontend
npm run build
# Serve the dist/ directory with any static host
```

Set `VITE_MIDDLEWARE_URL` to your deployed middleware URL before building.

---

## Environment Variables Reference

The root `.env` file is shared across all layers. Spring Boot picks up `DB_*` and `JAVA_BACKEND_URL` isn't needed for the backend itself — only the middleware needs it to proxy requests.

```env
# Auth
JWT_SECRET=<64-char random string>

# AI (optional — AI features disabled if missing)
GEMINI_API_KEY=<your gemini key>

# Middleware → Backend
JAVA_BACKEND_URL=http://localhost:8080

# Frontend → Middleware (set before building frontend)
VITE_MIDDLEWARE_URL=http://localhost:4000

# Database (used by Spring Boot)
DB_URL=jdbc:postgresql://host:port/dbname?sslmode=require
DB_USERNAME=postgres
DB_PASSWORD=<your password>
```
