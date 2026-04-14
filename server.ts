import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store for transactions (synced from client)
  let transactions: any[] = [];

  // API to sync transactions from client to server so MCP tools can see them
  app.post("/api/sync-transactions", (req, res) => {
    transactions = req.body.transactions || [];
    res.json({ status: "ok", count: transactions.length });
  });

  // --- MCP Server Implementation ---
  
  // SSE Transport for MCP
  let mcpClient: any = null;

  app.get("/mcp/sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for Nginx/Cloud Run
    res.flushHeaders();

    mcpClient = res;
    
    // Send initial connection event
    const endpoint = "/mcp/message";
    res.write(`event: endpoint\ndata: ${endpoint}\n\n`);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      mcpClient = null;
    });
  });

  app.post("/mcp/message", (req, res) => {
    const message = req.body;
    const { jsonrpc, method, params, id } = message;

    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "get_transactions",
              description: "Retrieve all financial transactions for analysis",
              inputSchema: {
                type: "object",
                properties: {
                  limit: { type: "number", description: "Optional limit of transactions to return" }
                }
              }
            },
            {
              name: "get_spending_summary",
              description: "Get a summary of spending by category",
              inputSchema: {
                type: "object",
                properties: {}
              }
            }
          ]
        }
      });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params;

      if (name === "get_transactions") {
        const limit = args?.limit || transactions.length;
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(transactions.slice(0, limit), null, 2)
              }
            ]
          }
        });
      }

      if (name === "get_spending_summary") {
        const summary: Record<string, number> = {};
        transactions.forEach(t => {
          if (t.amount < 0) {
            summary[t.category] = (summary[t.category] || 0) + Math.abs(t.amount);
          }
        });
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(summary, null, 2)
              }
            ]
          }
        });
      }
    }

    res.status(404).json({ error: "Method not found" });
  });

  // --- End MCP Server Implementation ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`MCP SSE endpoint: http://localhost:${PORT}/mcp/sse`);
  });
}

startServer();
