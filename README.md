# Yugi Finance Tracker

## Setup

### Environment
Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `VITE_MIDDLEWARE_URL` | Frontend → middleware URL (default: `http://localhost:4000`) |
| `JWT_SECRET` | 64-char random secret for token signing |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `JAVA_BACKEND_URL` | Spring Boot URL (default: `http://localhost:8080`) |
| `DB_URL` | PostgreSQL JDBC connection string |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials |

### Install
```bash
npm install
```

### Run (development)
```bash
# Frontend only (port 5173)
npm run dev:frontend

# Middleware only (port 4000)
npm run dev:server

# Both concurrently
npm run dev

# All three layers (includes Spring Boot)
npm run dev:full
```

### Build
```bash
npm run build
```

### Ports
- Frontend: `http://localhost:5173`
- Middleware: `http://localhost:4000`
- Spring Boot: `http://localhost:8080`
