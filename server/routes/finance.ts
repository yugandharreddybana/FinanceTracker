import { Router } from "express";
import { authMiddleware } from "../middleware/auth.ts";
import { financeService } from "../services/financeService.ts";

const router = Router();

// MCP State
let mcpClients: any[] = [];

router.use(authMiddleware);

// Sync transactions from frontend (for MCP tools)
router.post("/sync-transactions", (req, res) => {
  const { transactions: newTxs } = req.body;
  if (Array.isArray(newTxs)) {
    financeService.syncTransactions(newTxs);
  }
  res.json({ success: true });
});

// MCP SSE Endpoint
router.get("/mcp/sse", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  const messageEndpoint = `/api/finance/mcp/message?clientId=${clientId}`;
  
  res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

  const client = { id: clientId, res };
  mcpClients.push(client);

  req.on('close', () => {
    mcpClients = mcpClients.filter(c => c.id !== clientId);
  });
});

// MCP Message Endpoint (JSON-RPC)
router.post("/mcp/message", (req, res) => {
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
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "get_accounts",
            description: "Get all bank accounts and balances",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "get_budgets",
            description: "Get all budget categories and limits",
            inputSchema: { type: "object", properties: {} }
          }
        ]
      };
    } else if (method === "tools/call") {
      const { name } = params;
      if (name === "get_transactions") {
        result = { content: [{ type: "text", text: JSON.stringify(financeService.getTransactions()) }] };
      } else if (name === "get_accounts") {
        result = { content: [{ type: "text", text: JSON.stringify(financeService.getAccounts()) }] };
      } else if (name === "get_budgets") {
        result = { content: [{ type: "text", text: JSON.stringify(financeService.getBudgets()) }] };
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

// Transactions
router.get("/transactions", (req, res) => {
  res.json(financeService.transactions);
});

router.post("/transactions", (req, res) => {
  const newTransaction = { id: `tx-${Date.now()}`, ...req.body };
  financeService.transactions = [newTransaction, ...financeService.transactions];
  res.status(201).json(newTransaction);
});

router.put("/transactions/:id", (req, res) => {
  const { id } = req.params;
  financeService.transactions = financeService.transactions.map(t => t.id === id ? { ...t, ...req.body } : t);
  res.json(financeService.transactions.find(t => t.id === id));
});

router.patch("/transactions/bulk", (req, res) => {
  const { ids, updates } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  
  financeService.transactions = financeService.transactions.map(t => ids.includes(t.id) ? { ...t, ...updates } : t);
  res.json({ success: true, updatedCount: ids.length });
});

router.post("/transactions/bulk-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  
  financeService.transactions = financeService.transactions.filter(t => !ids.includes(t.id));
  res.json({ success: true, deletedCount: ids.length });
});

router.delete("/transactions/:id", (req, res) => {
  const { id } = req.params;
  financeService.transactions = financeService.transactions.filter(t => t.id !== id);
  res.status(204).send();
});

// Accounts
router.get("/accounts", (req, res) => {
  res.json(financeService.accounts);
});

router.post("/accounts", (req, res) => {
  const newAccount = { id: `acc-${Date.now()}`, ...req.body };
  financeService.accounts = [...financeService.accounts, newAccount];
  res.status(201).json(newAccount);
});

router.put("/accounts/:id", (req, res) => {
  const { id } = req.params;
  financeService.accounts = financeService.accounts.map(a => a.id === id ? { ...a, ...req.body } : a);
  res.json(financeService.accounts.find(a => a.id === id));
});

router.delete("/accounts/:id", (req, res) => {
  const { id } = req.params;
  financeService.accounts = financeService.accounts.filter(a => a.id !== id);
  res.status(204).send();
});

// Budgets
router.get("/budgets", (req, res) => {
  res.json(financeService.budgets);
});

router.post("/budgets", (req, res) => {
  const newBudget = { id: `budget-${Date.now()}`, ...req.body };
  financeService.budgets = [...financeService.budgets, newBudget];
  res.status(201).json(newBudget);
});

router.put("/budgets/:id", (req, res) => {
  const { id } = req.params;
  financeService.budgets = financeService.budgets.map(b => b.id === id ? { ...b, ...req.body } : b);
  res.json(financeService.budgets.find(b => b.id === id));
});

router.delete("/budgets/:id", (req, res) => {
  const { id } = req.params;
  financeService.budgets = financeService.budgets.filter(b => b.id !== id);
  res.status(204).send();
});

// Loans
router.get("/loans", (req, res) => {
  res.json(financeService.loans);
});

router.post("/loans", (req, res) => {
  const newLoan = { id: `loan-${Date.now()}`, ...req.body };
  financeService.loans = [...financeService.loans, newLoan];
  res.status(201).json(newLoan);
});

router.put("/loans/:id", (req, res) => {
  const { id } = req.params;
  financeService.loans = financeService.loans.map(l => l.id === id ? { ...l, ...req.body } : l);
  res.json(financeService.loans.find(l => l.id === id));
});

router.delete("/loans/:id", (req, res) => {
  const { id } = req.params;
  financeService.loans = financeService.loans.filter(l => l.id !== id);
  res.status(204).send();
});

// Savings Goals
router.get("/savings-goals", (req, res) => {
  res.json(financeService.savingsGoals);
});

router.post("/savings-goals", (req, res) => {
  const newGoal = { id: `goal-${Date.now()}`, ...req.body };
  financeService.savingsGoals = [...financeService.savingsGoals, newGoal];
  res.status(201).json(newGoal);
});

router.put("/savings-goals/:id", (req, res) => {
  const { id } = req.params;
  financeService.savingsGoals = financeService.savingsGoals.map(g => g.id === id ? { ...g, ...req.body } : g);
  res.json(financeService.savingsGoals.find(g => g.id === id));
});

router.delete("/savings-goals/:id", (req, res) => {
  const { id } = req.params;
  financeService.savingsGoals = financeService.savingsGoals.filter(g => g.id !== id);
  res.status(204).send();
});

// Recurring Payments
router.get("/recurring-payments", (req, res) => {
  res.json(financeService.recurringPayments);
});

router.post("/recurring-payments", (req, res) => {
  const newPayment = { id: `rec-${Date.now()}`, ...req.body };
  financeService.recurringPayments = [...financeService.recurringPayments, newPayment];
  res.status(201).json(newPayment);
});

router.put("/recurring-payments/:id", (req, res) => {
  const { id } = req.params;
  financeService.recurringPayments = financeService.recurringPayments.map(p => p.id === id ? { ...p, ...req.body } : p);
  res.json(financeService.recurringPayments.find(p => p.id === id));
});

router.delete("/recurring-payments/:id", (req, res) => {
  const { id } = req.params;
  financeService.recurringPayments = financeService.recurringPayments.filter(p => p.id !== id);
  res.status(204).send();
});

// Income Sources
router.get("/income-sources", (req, res) => {
  res.json(financeService.incomeSources);
});

router.post("/income-sources", (req, res) => {
  const newIncome = { id: `income-${Date.now()}`, ...req.body };
  financeService.incomeSources = [...financeService.incomeSources, newIncome];
  res.status(201).json(newIncome);
});

router.put("/income-sources/:id", (req, res) => {
  const { id } = req.params;
  financeService.incomeSources = financeService.incomeSources.map(i => i.id === id ? { ...i, ...req.body } : i);
  res.json(financeService.incomeSources.find(i => i.id === id));
});

router.delete("/income-sources/:id", (req, res) => {
  const { id } = req.params;
  financeService.incomeSources = financeService.incomeSources.filter(i => i.id !== id);
  res.status(204).send();
});

export { router as financeRouter };
