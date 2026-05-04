import { Router, Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../routes/auth.js";
import crypto from "node:crypto";

const router = Router();

// S5/S6/S7: Protect all finance routes with auth
router.use(authMiddleware);

// General rate limit for finance API — 200 requests per 15 minutes per IP
const financeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
router.use(financeLimiter);

// E5: Validate request body for all write operations
function validateBody(req: Request, res: Response, next: NextFunction) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    res.status(400).json({ error: 'Request body must be a JSON object' });
    return;
  }
  next();
}
router.use(validateBody);

// Spring Boot backend URL — configured via environment variable
const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";
const BACKEND_API = `${BACKEND_URL}/api/finance`;

// ---------------------------------------------------------------------------
// Generic proxy helper — forwards requests to Spring Boot
// ---------------------------------------------------------------------------

async function proxyToBackend(req: Request, res: Response, path: string, method?: string) {
  // Prevent path traversal — path must start with / and contain no traversal sequences
  if (!path.startsWith('/') || /\.\./.test(path)) {
    res.status(400).json({ error: "Invalid request path" });
    return;
  }

  const effectiveMethod = method || req.method;

  try {
    const url = `${BACKEND_API}${path}`;

    // Prefer user from authMiddleware; fall back to manual token extraction
    const user = (req as any).user;
    const userId = user?.uid;

    // Forward the Authorization header; reconstruct it from cookie when absent
    const authToken =
      req.headers.authorization ||
      ((req as any).cookies?.auth_token ? `Bearer ${(req as any).cookies.auth_token}` : undefined);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: authToken } : {}),
      ...(userId ? { "X-User-Id": userId } : {}),
    };

    // M10: Forward request ID for distributed tracing
    headers['X-Request-ID'] = (req as any).requestId || crypto.randomUUID();

    const options: RequestInit = {
      method: effectiveMethod,
      headers,
    };

    // Forward request body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(effectiveMethod)) {
      let body = req.body;
      // Inject userId into body if missing and we have it from token
      if (userId && typeof body === 'object' && body !== null) {
        body = { ...body, userId: body.userId || userId };
      }
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // M5: Add Cache-Control for successful GET responses
    if (effectiveMethod === 'GET' && response.ok) {
      res.setHeader('Cache-Control', 'private, max-age=30');
    }

    // Forward status code
    if (response.status === 204) {
      return res.status(204).send();
    }

    // E4: Handle backend unavailability (502/503/504)
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      console.error(`[proxy] ${effectiveMethod} ${path} upstream returned ${response.status}`);
      if (effectiveMethod === 'GET') {
        return res.status(200).json({ data: [], message: 'Service temporarily unavailable. Showing cached data.' });
      }
      return res.status(503).json({ error: 'Unable to save changes. Please try again.' });
    }

    const data = await response.json().catch(() => null);
    res.status(response.status).json(data);
  } catch (err: any) {
    console.error(`[proxy] ${effectiveMethod} ${path}`, err.message);
    // E4: Network errors treated the same as 502/503
    if (effectiveMethod === 'GET') {
      return res.status(200).json({ data: [], message: 'Service temporarily unavailable. Showing cached data.' });
    }
    return res.status(503).json({ error: 'Unable to save changes. Please try again.' });
  }
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

router.get("/transactions", (req, res) => proxyToBackend(req, res, "/transactions"));
router.post("/transactions", (req, res) => proxyToBackend(req, res, "/transactions"));
router.put("/transactions/:id", (req, res) => proxyToBackend(req, res, `/transactions/${req.params.id}`));
router.patch("/transactions/bulk", (req, res) => proxyToBackend(req, res, "/transactions/bulk"));
router.post("/transactions/bulk-delete", (req, res) => proxyToBackend(req, res, "/transactions/bulk-delete"));

router.delete("/transactions/:id", (req, res) => proxyToBackend(req, res, `/transactions/${req.params.id}`));

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

router.get("/accounts", (req, res) => proxyToBackend(req, res, "/accounts"));
router.post("/accounts", (req, res) => proxyToBackend(req, res, "/accounts"));
router.put("/accounts/:id", (req, res) => proxyToBackend(req, res, `/accounts/${req.params.id}`));
router.delete("/accounts/:id", (req, res) => proxyToBackend(req, res, `/accounts/${req.params.id}`));

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

router.get("/budgets", (req, res) => proxyToBackend(req, res, "/budgets"));
router.post("/budgets", (req, res) => proxyToBackend(req, res, "/budgets"));
router.put("/budgets/:id", (req, res) => proxyToBackend(req, res, `/budgets/${req.params.id}`));
router.delete("/budgets/:id", (req, res) => proxyToBackend(req, res, `/budgets/${req.params.id}`));

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

router.get("/loans", (req, res) => proxyToBackend(req, res, "/loans"));
router.post("/loans", (req, res) => proxyToBackend(req, res, "/loans"));
router.put("/loans/:id", (req, res) => proxyToBackend(req, res, `/loans/${req.params.id}`));
router.delete("/loans/:id", (req, res) => proxyToBackend(req, res, `/loans/${req.params.id}`));

// ---------------------------------------------------------------------------
// Savings Goals
// ---------------------------------------------------------------------------

router.get("/savings-goals", (req, res) => proxyToBackend(req, res, "/savings-goals"));
router.post("/savings-goals", (req, res) => proxyToBackend(req, res, "/savings-goals"));
router.put("/savings-goals/:id", (req, res) => proxyToBackend(req, res, `/savings-goals/${req.params.id}`));
router.delete("/savings-goals/:id", (req, res) => proxyToBackend(req, res, `/savings-goals/${req.params.id}`));

// ---------------------------------------------------------------------------
// Recurring Payments
// ---------------------------------------------------------------------------

router.get("/recurring-payments", (req, res) => proxyToBackend(req, res, "/recurring-payments"));
router.post("/recurring-payments", (req, res) => proxyToBackend(req, res, "/recurring-payments"));
router.put("/recurring-payments/:id", (req, res) => proxyToBackend(req, res, `/recurring-payments/${req.params.id}`));
router.delete("/recurring-payments/:id", (req, res) => proxyToBackend(req, res, `/recurring-payments/${req.params.id}`));

// ---------------------------------------------------------------------------
// Income Sources
// ---------------------------------------------------------------------------

router.get("/income-sources", (req, res) => proxyToBackend(req, res, "/income-sources"));
router.post("/income-sources", (req, res) => proxyToBackend(req, res, "/income-sources"));
router.put("/income-sources/:id", (req, res) => proxyToBackend(req, res, `/income-sources/${req.params.id}`));
router.delete("/income-sources/:id", (req, res) => proxyToBackend(req, res, `/income-sources/${req.params.id}`));

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

router.get("/investments", (req, res) => proxyToBackend(req, res, "/investments"));
router.post("/investments", (req, res) => proxyToBackend(req, res, "/investments"));
router.put("/investments/:id", (req, res) => proxyToBackend(req, res, `/investments/${req.params.id}`));
router.delete("/investments/:id", (req, res) => proxyToBackend(req, res, `/investments/${req.params.id}`));

// ---------------------------------------------------------------------------
// User Profiles
// ---------------------------------------------------------------------------

router.get("/user-profiles", (req, res) => proxyToBackend(req, res, "/user-profiles"));
router.post("/user-profiles", (req, res) => proxyToBackend(req, res, "/user-profiles"));
router.get("/user-profiles/by-email/:email", (req, res) =>
  proxyToBackend(req, res, `/user-profiles/by-email/${encodeURIComponent(req.params.email)}`));
router.get("/user-profiles/:id", (req, res) => proxyToBackend(req, res, `/user-profiles/${req.params.id}`));
router.put("/user-profiles/:id", (req, res) => proxyToBackend(req, res, `/user-profiles/${req.params.id}`));
router.delete("/user-profiles/:id", (req, res) => proxyToBackend(req, res, `/user-profiles/${req.params.id}`));

// Convenience: delete by email — looks up the profile then deletes by id
router.delete("/user-profiles/by-email/:email", async (req, res) => {
  try {
    // 1. Delete by email (handles profile and cascade in backend)
    const del = await fetch(`${BACKEND_API}/user-profiles/by-email/${encodeURIComponent(req.params.email)}`, { method: "DELETE" });

    // 2. Also try to purge by UID from token for extra safety (especially if profile email mismatch)
    const user = (req as any).user;
    if (user?.uid) {
      await fetch(`${BACKEND_API}/user-profiles/purge/${user.uid}`, { method: "DELETE" });
    }

    res.status(del.status).send();
  } catch (err: any) {
    res.status(502).json({ error: "Backend unavailable", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Sync transactions cache (used by MCP fallback) — M9: per-user cache
// ---------------------------------------------------------------------------

const userTransactionCache = new Map<string, any[]>();

router.post("/sync-transactions", (req, res) => {
  const userId = (req as any).user?.uid || 'anonymous';
  userTransactionCache.set(userId, Array.isArray(req.body?.transactions) ? req.body.transactions : []);
  res.json({ ok: true, count: userTransactionCache.get(userId)!.length });
});
router.get("/sync-transactions", (req, res) => {
  const userId = (req as any).user?.uid || 'anonymous';
  res.json({ transactions: userTransactionCache.get(userId) || [] });
});

// ---------------------------------------------------------------------------
// MCP Endpoints (kept for AI Oracle integration)
// ---------------------------------------------------------------------------

let mcpClients: any[] = [];

router.get("/mcp/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const clientId = Date.now();
  const messageEndpoint = `/api/finance/mcp/message?clientId=${clientId}`;
  res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

  const client = { id: clientId, res };
  mcpClients.push(client);

  req.on("close", () => {
    mcpClients = mcpClients.filter((c) => c.id !== clientId);
  });
});

router.post("/mcp/message", async (req, res) => {
  const { method, params, id } = req.body;

  let result: any = null;
  let error: any = null;

  try {
    if (method === "tools/list") {
      result = {
        tools: [
          {
            name: "get_transactions",
            description: "Get all financial transactions",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "get_accounts",
            description: "Get all bank accounts and balances",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "get_budgets",
            description: "Get all budget categories and limits",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "create_transaction",
            description: "Record a new financial transaction (expense or income)",
            inputSchema: {
              type: "object",
              properties: {
                merchant: { type: "string", description: "The merchant or source (e.g. Starbucks, Salary)" },
                amount: { type: "number", description: "The transaction amount" },
                currency: { type: "string", description: "The currency code (e.g. EUR, USD, INR)" },
                date: { type: "string", description: "The date in YYYY-MM-DD format" },
                category: { type: "string", description: "The category (e.g. Food, Transport, Rent)" },
                type: { type: "string", enum: ["EXPENSE", "INCOME"], description: "The transaction type" },
                account: { type: "string", description: "The bank account name (e.g. Revolut, Main Current)" }
              },
              required: ["merchant", "amount", "type"]
            }
          }

        ],
      };
    } else if (method === "tools/call") {
      const { name, arguments: args } = params;
      // Proxy MCP tool calls to backend
      const toolMap: Record<string, { endpoint: string, method: string }> = {
        "get_transactions": { endpoint: "/transactions", method: "GET" },
        "get_accounts": { endpoint: "/accounts", method: "GET" },
        "get_budgets": { endpoint: "/budgets", method: "GET" },
        "create_transaction": { endpoint: "/transactions", method: "POST" }
      };

      const tool = toolMap[name];
      if (tool) {
        const response = await fetch(`${BACKEND_API}${tool.endpoint}`, {
          method: tool.method,
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.authorization ? { Authorization: req.headers.authorization as string } : {}),
          },
          ...(tool.method === "POST" ? { body: JSON.stringify(args) } : {})
        });

        let data = await response.json();
        // M9: For get_transactions, merge with per-user cache as fallback
        if (name === "get_transactions" && (!Array.isArray(data) || data.length === 0)) {
          const userId = (req as any).user?.uid || 'anonymous';
          data = userTransactionCache.get(userId) || [];
        }
        result = { content: [{ type: "text", text: JSON.stringify(data) }] };
      } else {
        error = { code: -32601, message: "Tool not found" };
      }
    } else {
      error = { code: -32601, message: "Method not found" };
    }
  } catch (err: any) {
    error = { code: -32603, message: err.message };
  }

  res.json({ jsonrpc: "2.0", id, result, error });
});

export { router as financeRouter };
