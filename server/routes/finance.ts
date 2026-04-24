import { Router, Request, Response } from "express";
import { verifyToken } from "../lib/auth.js";

const router = Router();

// Spring Boot backend URL — configured via environment variable
const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";
const BACKEND_API = `${BACKEND_URL}/api/finance`;

// ---------------------------------------------------------------------------
// Generic proxy helper — forwards requests to Spring Boot
// ---------------------------------------------------------------------------

async function proxyToBackend(req: Request, res: Response, path: string, method?: string) {
  try {
    const url = `${BACKEND_API}${path}`;
    
    // Extract userId from JWT if available
    const authHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const decoded = authHeader ? verifyToken(authHeader) : null;
    const userId = decoded?.uid;

    const options: RequestInit = {
      method: method || req.method,
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        ...(userId ? { "X-User-Id": userId } : {}),
      },
    };

    // Forward request body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(options.method!)) {
      let body = req.body;
      // Inject userId into body if missing and we have it from token
      if (userId && typeof body === 'object' && body !== null) {
        body = { ...body, userId: body.userId || userId };
      }
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Forward status code
    if (response.status === 204) {
      return res.status(204).send();
    }

    const data = await response.json().catch(() => null);
    res.status(response.status).json(data);
  } catch (err: any) {
    console.error(`Proxy error [${req.method} ${path}]:`, err.message);
    res.status(502).json({ error: "Backend unavailable", details: err.message });
  }
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

router.get("/transactions", (req, res) => proxyToBackend(req, res, "/transactions"));
router.post("/transactions", (req, res) => proxyToBackend(req, res, "/transactions"));
router.put("/transactions/:id", (req, res) => proxyToBackend(req, res, `/transactions/${req.params.id}`));
router.patch("/transactions/bulk", (req, res) => proxyToBackend(req, res, "/transactions/bulk"));
router.delete("/transactions/bulk", (req, res) => {
  const ids = (req.query.ids as string) || '';
  proxyToBackend(req, res, `/transactions/bulk?ids=${ids}`);
});
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
    const authHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const decoded = authHeader ? verifyToken(authHeader) : null;
    if (decoded?.uid) {
      await fetch(`${BACKEND_API}/user-profiles/purge/${decoded.uid}`, { method: "DELETE" });
    }
    
    res.status(del.status).send();
  } catch (err: any) {
    res.status(502).json({ error: "Backend unavailable", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Sync transactions cache (used by MCP fallback)
// ---------------------------------------------------------------------------

let cachedTransactions: any[] = [];
router.post("/sync-transactions", (req, res) => {
  cachedTransactions = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
  res.json({ ok: true, count: cachedTransactions.length });
});
router.get("/sync-transactions", (_req, res) => res.json({ transactions: cachedTransactions }));

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

        const data = await response.json();
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
