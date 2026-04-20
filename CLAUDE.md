Purpose
Minimal, persistent project context. Read this first.
Open referenced files only when directly needed — never speculatively.

Global Rules
TypeScript strict mode throughout; no any unless explicitly justified with a comment.

Write unit/integration tests for every new function or bug fix.

Frontend: vitest (see packages/frontend/vitest.config.ts)

Server: tests live in server/test/

Follow existing folder and naming conventions; do not introduce new patterns without discussion.

Never commit secrets or API keys; use .env files (see .env.example for all required vars).

Never force-push to main; use feature branches and PRs.

Keep React components small and single-responsibility; extract reusable logic to hooks or utils.

Validate all external API responses; never trust unvalidated data shapes.

Multi-currency is a core feature — always account for currency context when touching financial data.

Architecture
Monorepo. Frontend and backend are independently deployed.

text
FinanceTracker/
├── packages/
│   └── frontend/           # React + TypeScript + Vite (deployed to Vercel)
│       └── src/
│           ├── App.tsx         # Root component and routing
│           ├── components/     # UI components
│           ├── context/        # React context providers
│           ├── services/       # API call abstractions
│           ├── lib/            # Utility functions
│           ├── constants/      # App-wide constants
│           └── types.ts        # Shared TypeScript types
├── server/                 # Node.js + TypeScript API (deployed to Railway)
│   ├── index.ts            # Server entry point, Express setup
│   ├── routes/             # API route handlers
│   ├── middleware/         # Auth, error handling, etc.
│   ├── lib/                # Server utilities and helpers
│   └── test/               # Server-side tests
├── backend/                # Additional backend logic / integrations
├── scripts/                # Utility and seed scripts (run manually only)
├── data/                   # Static seed/mock data
├── skills/                 # AI agent skill definitions
└── .agents/                # Agent configuration files
Key Reference Files (load on demand)
.env.example — All required environment variables with descriptions

packages/frontend/src/types.ts — Shared frontend TypeScript types

packages/frontend/src/constants.ts — App-wide constants

packages/frontend/src/App.tsx — Root component, routing structure

packages/frontend/src/services/ — API call abstractions

server/index.ts — Server entry point and middleware registration

server/routes/ — API route definitions

server/middleware/ — Auth and error handling middleware

vercel.json — Frontend deployment config

server/railway.json — Backend deployment config

Session & Compaction Guidance
On /compact: preserve open TODOs, unresolved bugs, active feature context, design decisions.

Drop: verbose chain-of-thought, resolved debug logs, old experiment notes.

Start a fresh session for unrelated tasks (e.g. don't mix a UI bug fix with a backend route refactor).

Ask clarifying questions before reading entire directories — target specific files.

