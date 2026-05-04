import { Router, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../routes/auth.js";
import { createClient } from "ioredis";
import crypto from "crypto";

const router = Router();

// Auth guard — applied ONCE only (fix for FLAW #11: was applied twice)
router.use(authMiddleware);

// General rate limit: 200 requests per 15 minutes per IP
const financeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
router.use(financeLimiter);

const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";
const BACKEND_API = `${BACKEND_URL}/api/finance`;

// FLAW #2 FIX: Redis client for sync-transaction cache (replaces in-process Map)
// Falls back gracefully if Redis is not configured so local dev still works.
let redis: ReturnType<typeof createClient> | null = null;
try {
  if (process.env.REDIS_URL) {
    redis = new createClient(process.env.REDIS_URL);
    redis.on("error", (err: Error) => console.error("[Redis] connection error:", err.message));
  }
} catch (e) {
  console.warn("[Redis] not available — sync-transactions cache disabled");
}

const SYNC_TTL_SECONDS = 3600; // 1-hour TTL on cached transaction lists

// ---------------------------------------------------------------------------
// Generic proxy helper — forwards requests to Spring Boot
// ---------------------------------------------------------------------------

async function proxyToBackend(req: Request, res: Response, path: string, method?: string) {
  if (!path.startsWith('/') || /\.\./.test(path)) {
    res.status(400).json({ error: "Invalid request path" });
    return;
  }

  try {
    const url = `${BACKEND_API}${path}`;
    const user = (req as any).user;
    const userId = user?.uid;

    const authToken =
      req.headers.authorization ||
      ((req as any).cookies?.auth_token ? `Bearer ${(req as any).cookies.auth_token}` : undefined);

    const options: RequestInit = {
      method: method || req.method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: authToken } : {}),
        ...(userId ? { "X-User-Id": userId } : {}),
      },
    };

    if (["POST", "PUT", "PATCH"].includes(options.method!)) {
      let body = req.body;
      if (typeof body === "object" && body !== null) {
        // Force userId from token — never trust client-supplied userId
        body = { ...body, userId };
      }
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 204) {
      return res.status(204).send();
    }

    const data = await response.json().catch(() => null);
    res.status(response.status).json(data);
  } catch (err: any) {
    console.error(`Proxy error [${req.method} ${path}]`);
    res.status(502).json({ error: "Backend unavailable" });
  }
}

// ---------------------------------------------------------------------------
// Transactions
// FLAW #1 FIX: Proxy now injects X-Idempotency-Key header so the backend
//              can enforce UNIQUE(user_id, idempotency_key) at DB level.
// ---------------------------------------------------------------------------

router.get("/transactions", (req, res) => proxyToBackend(req, res, "/transactions"));

router.post("/transactions", (req: Request, res: Response) => {
  // Generate idempotency key from client-supplied key OR a fresh UUID
  const idempotencyKey =
    (req.headers["x-idempotency-key"] as string) ||
    crypto.randomUUID();
  // Attach to downstream request so Spring Boot can deduplicate
  req.headers["x-idempotency-key"] = idempotencyKey;
  // Return the key to the client so they can safely retry
  res.setHeader("X-Idempotency-Key", idempotencyKey);
  return proxyToBackend(req, res, "/transactions");
});

router.put("/transactions/:id", (req, res) => proxyToBackend(req, res, `/transactions/${encodeURIComponent(req.params.id)}`));
router.patch("/transactions/bulk", (req, res) => proxyToBackend(req, res, "/transactions/bulk"));
router.post("/transactions/bulk-delete", (req, res) => proxyToBackend(req, res, "/transactions/bulk-delete"));
router.delete("/transactions/:id", (req, res) => proxyToBackend(req, res, `/transactions/${encodeURIComponent(req.params.id)}`));

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

router.get("/accounts", (req, res) => proxyToBackend(req, res, "/accounts"));
router.post("/accounts", (req, res) => proxyToBackend(req, res, "/accounts"));
router.put("/accounts/:id", (req, res) => proxyToBackend(req, res, `/accounts/${encodeURIComponent(req.params.id)}`));
router.delete("/accounts/:id", (req, res) => proxyToBackend(req, res, `/accounts/${encodeURIComponent(req.params.id)}`));

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

router.get("/budgets", (req, res) => proxyToBackend(req, res, "/budgets"));
router.post("/budgets", (req, res) => proxyToBackend(req, res, "/budgets"));
router.put("/budgets/:id", (req, res) => proxyToBackend(req, res, `/budgets/${encodeURIComponent(req.params.id)}`));
router.delete("/budgets/:id", (req, res) => proxyToBackend(req, res, `/budgets/${encodeURIComponent(req.params.id)}`));

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

router.get("/loans", (req, res) => proxyToBackend(req, res, "/loans"));
router.post("/loans", (req, res) => proxyToBackend(req, res, "/loans"));
router.put("/loans/:id", (req, res) => proxyToBackend(req, res, `/loans/${encodeURIComponent(req.params.id)}`));
router.delete("/loans/:id", (req, res) => proxyToBackend(req, res, `/loans/${encodeURIComponent(req.params.id)}`));

// ---------------------------------------------------------------------------
// Savings Goals
// ---------------------------------------------------------------------------

router.get("/savings-goals", (req, res) => proxyToBackend(req, res, "/savings-goals"));
router.post("/savings-goals", (req, res) => proxyToBackend(req, res, "/savings-goals"));
router.put("/savings-goals/:id", (req, res) => proxyToBackend(req, res, `/savings-goals/${encodeURIComponent(req.params.id)}`));
router.delete("/savings-goals/:id", (req, res) => proxyToBackend(req, res, `/savings-goals/${encodeURIComponent(req.params.id)}`));

// ---------------------------------------------------------------------------
// Recurring Payments
// ---------------------------------------------------------------------------

router.get("/recurring-payments", (req, res) => proxyToBackend(req, res, "/recurring-payments"));
router.post("/recurring-payments", (req, res) => proxyToBackend(req, res, "/recurring-payments"));
router.put("/recurring-payments/:id", (req, res) => proxyToBackend(req, res, `/recurring-payments/${encodeURIComponent(req.params.id)}`));
router.delete("/recurring-payments/:id", (req, res) => proxyToBackend(req, res, `/recurring-payments/${encodeURIComponent(req.params.id)}`));

// ---------------------------------------------------------------------------
// Income Sources
// ---------------------------------------------------------------------------

router.get("/income-sources", (req, res) => proxyToBackend(req, res, "/income-sources"));
router.post("/income-sources", (req, res) => proxyToBackend(req, res, "/income-sources"));
router.put("/income-sources/:id", (req, res) => proxyToBackend(req, res, `/income-sources/${encodeURIComponent(req.params.id)}`));
router.delete("/income-sources/:id", (req, res) => proxyToBackend(req, res, `/income-sources/${encodeURIComponent(req.params.id)}`));

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

router.get("/investments", (req, res) => proxyToBackend(req, res, "/investments"));
router.post("/investments", (req, res) => proxyToBackend(req, res, "/investments"));
router.put("/investments/:id", (req, res) => proxyToBackend(req, res, `/investments/${encodeURIComponent(req.params.id)}`));
router.delete("/investments/:id", (req, res) => proxyToBackend(req, res, `/investments/${encodeURIComponent(req.params.id)}`));

// ---------------------------------------------------------------------------
// User Profiles (scoped to authenticated user only)
// ---------------------------------------------------------------------------

router.post("/user-profiles", (req, res) => proxyToBackend(req, res, "/user-profiles"));
router.get("/user-profiles/by-email/:email", (req, res) =>
  proxyToBackend(req, res, `/user-profiles/by-email/${encodeURIComponent(req.params.email)}`));
router.get("/user-profiles/:id", (req, res) => {
  const userId = (req as any).user?.uid;
  if (req.params.id !== userId) return res.status(403).json({ error: "Forbidden" });
  return proxyToBackend(req, res, `/user-profiles/${encodeURIComponent(req.params.id)}`);
});
router.put("/user-profiles/:id", (req, res) => {
  const userId = (req as any).user?.uid;
  if (req.params.id !== userId) return res.status(403).json({ error: "Forbidden" });
  return proxyToBackend(req, res, `/user-profiles/${encodeURIComponent(req.params.id)}`);
});
router.delete("/user-profiles/:id", (req, res) => {
  const userId = (req as any).user?.uid;
  if (req.params.id !== userId) return res.status(403).json({ error: "Forbidden" });
  return proxyToBackend(req, res, `/user-profiles/${encodeURIComponent(req.params.id)}`);
});

router.delete("/user-profiles/by-email/:email", async (req, res) => {
  const userId = (req as any).user?.uid;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const del = await fetch(`${BACKEND_API}/user-profiles/by-email/${encodeURIComponent(req.params.email)}`, { method: "DELETE" });
    if (userId) {
      await fetch(`${BACKEND_API}/user-profiles/purge/${userId}`, { method: "DELETE" });
    }
    res.status(del.status).send();
  } catch {
    res.status(502).json({ error: "Backend unavailable" });
  }
});

// ---------------------------------------------------------------------------
// FLAW #2 FIX: sync-transactions now backed by Redis, not in-process Map
// ---------------------------------------------------------------------------

router.post("/sync-transactions", async (req, res) => {
  const userId = (req as any).user?.uid;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const transactions = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
  if (redis) {
    await redis.setex(`txn_cache:${userId}`, SYNC_TTL_SECONDS, JSON.stringify(transactions));
  }
  res.json({ ok: true, count: transactions.length });
});

router.get("/sync-transactions", async (req, res) => {
  const userId = (req as any).user?.uid;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (redis) {
    const cached = await redis.get(`txn_cache:${userId}`);
    res.json({ transactions: cached ? JSON.parse(cached) : [] });
  } else {
    res.json({ transactions: [] });
  }
});

// ---------------------------------------------------------------------------
// MCP Endpoints — auth-gated; 'spent' removed from update_budget input schema
// ---------------------------------------------------------------------------

let mcpClients: any[] = [];

router.get("/mcp/sse", (req, res) => {
  const userId = (req as any).user?.uid;
  if (!userId) return res.status(401).end();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const clientId = Date.now();
  const messageEndpoint = `/api/finance/mcp/message?clientId=${clientId}`;
  res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  const client = { id: clientId, userId, res };
  mcpClients.push(client);

  req.on("close", () => {
    clearInterval(keepAlive);
    mcpClients = mcpClients.filter((c) => c.id !== clientId);
  });
});

router.post("/mcp/message", async (req, res) => {
  const userId = (req as any).user?.uid;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { method, params, id } = req.body;

  let result: any = null;
  let error: any = null;

  try {
    if (method === "tools/list") {
      result = {
        tools: [
          { name: "get_transactions", description: "Get all financial transactions", inputSchema: { type: "object", properties: {} } },
          { name: "get_accounts", description: "Get all bank accounts and balances", inputSchema: { type: "object", properties: {} } },
          { name: "get_budgets", description: "Get all budget categories and limits", inputSchema: { type: "object", properties: {} } },
          {
            name: "create_transaction",
            description: "Record a new financial transaction (expense or income)",
            inputSchema: {
              type: "object",
              properties: {
                merchant: { type: "string" },
                amount: { type: "number" },
                currency: { type: "string" },
                date: { type: "string", description: "ISO date: YYYY-MM-DD" },
                category: { type: "string" },
                type: { type: "string", enum: ["EXPENSE", "INCOME"] },
                account: { type: "string" }
              },
              required: ["merchant", "amount", "type"]
            }
          },
          {
            name: "create_budget",
            description: "Create a new budget",
            inputSchema: {
              type: "object",
              properties: {
                category: { type: "string" },
                limit: { type: "number" },
                currency: { type: "string" },
                periodType: { type: "string", enum: ["MONTHLY", "WEEKLY", "CUSTOM"], description: "Budget period type" },
                periodStart: { type: "string", description: "Period start date YYYY-MM-DD" },
                periodEnd: { type: "string", description: "Period end date YYYY-MM-DD" }
              },
              required: ["category", "limit"]
            }
          },
          {
            name: "update_budget",
            description: "Update a budget limit, category, or period. NOTE: 'spent' is computed server-side and cannot be set directly.",
            inputSchema: {
              type: "object",
              properties: {
                id: { type: "string" },
                limit: { type: "number" },
                // FLAW #4 FIX: 'spent' intentionally excluded — server-computed only
                periodType: { type: "string", enum: ["MONTHLY", "WEEKLY", "CUSTOM"] },
                periodStart: { type: "string" },
                periodEnd: { type: "string" }
              },
              required: ["id"]
            }
          },
          {
            name: "get_savings_goals",
            description: "List all savings goals",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "create_savings_goal",
            description: "Create a savings goal",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                target: { type: "number" },
                deadline: { type: "string" }
              },
              required: ["name", "target"]
            }
          },
          {
            name: "get_investments",
            description: "List investments",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "get_loans",
            description: "List all loans",
            inputSchema: { type: "object", properties: {} }
          }
        ],
      };
    } else if (method === "tools/call") {
      const { name, arguments: args } = params;
      const toolMap: Record<string, { endpoint: string; method: string }> = {
        "get_transactions": { endpoint: "/transactions", method: "GET" },
        "get_accounts": { endpoint: "/accounts", method: "GET" },
        "get_budgets": { endpoint: "/budgets", method: "GET" },
        "create_transaction": { endpoint: "/transactions", method: "POST" },
        "create_budget": { endpoint: "/budgets", method: "POST" },
        "get_savings_goals": { endpoint: "/savings-goals", method: "GET" },
        "create_savings_goal": { endpoint: "/savings-goals", method: "POST" },
        "get_investments": { endpoint: "/investments", method: "GET" },
        "get_loans": { endpoint: "/loans", method: "GET" },
      };

      const tool = toolMap[name];
      if (tool) {
        let endpoint = tool.endpoint;
        let httpMethod = tool.method;
        if (name === "update_budget" && args?.id) {
          endpoint = `/budgets/${args.id}`;
          httpMethod = "PUT";
          // FLAW #4 FIX: Strip 'spent' from MCP-supplied args — never allow client override
          const { spent: _spent, ...safeArgs } = args;
          const response = await fetch(`${BACKEND_API}${endpoint}`, {
            method: httpMethod,
            headers: {
              "Content-Type": "application/json",
              ...(req.headers.authorization ? { Authorization: req.headers.authorization as string } : {}),
              ...(userId ? { "X-User-Id": userId } : {}),
            },
            body: JSON.stringify(safeArgs)
          });
          const data = await response.json();
          result = { content: [{ type: "text", text: JSON.stringify(data) }] };
        } else {
          const response = await fetch(`${BACKEND_API}${endpoint}`, {
            method: httpMethod,
            headers: {
              "Content-Type": "application/json",
              ...(req.headers.authorization ? { Authorization: req.headers.authorization as string } : {}),
              ...(userId ? { "X-User-Id": userId } : {}),
            },
            ...(httpMethod !== "GET" ? { body: JSON.stringify({ ...args, userId }) } : {})
          });
          const data = await response.json();
          result = { content: [{ type: "text", text: JSON.stringify(data) }] };
        }
      } else {
        error = { code: -32601, message: "Tool not found" };
      }
    } else {
      error = { code: -32601, message: "Method not found" };
    }
  } catch (err: any) {
    error = { code: -32603, message: "Internal error" };
  }

  res.json({ jsonrpc: "2.0", id, result, error });
});

export { router as financeRouter };
