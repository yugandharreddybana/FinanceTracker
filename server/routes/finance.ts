import { Router } from "express";
import { authMiddleware } from "../middleware/auth.ts";
import { 
  MOCK_TRANSACTIONS, 
  MOCK_ACCOUNTS, 
  MOCK_BUDGETS, 
  MOCK_LOANS, 
  MOCK_SAVINGS_GOALS, 
  MOCK_RECURRING,
  MOCK_INCOME 
} from "../../src/constants.ts";

const router = Router();

// In-memory storage
let transactions = [...MOCK_TRANSACTIONS];
let accounts = [...MOCK_ACCOUNTS];
let budgets = [...MOCK_BUDGETS];
let loans = [...MOCK_LOANS];
let savingsGoals = [...MOCK_SAVINGS_GOALS];
let recurringPayments = [...MOCK_RECURRING];
let incomeSources = [...MOCK_INCOME];

router.use(authMiddleware);

// Transactions
router.get("/transactions", (req, res) => {
  res.json(transactions);
});

router.post("/transactions", (req, res) => {
  const newTransaction = { id: `tx-${Date.now()}`, ...req.body };
  transactions = [newTransaction, ...transactions];
  res.status(201).json(newTransaction);
});

router.put("/transactions/:id", (req, res) => {
  const { id } = req.params;
  transactions = transactions.map(t => t.id === id ? { ...t, ...req.body } : t);
  res.json(transactions.find(t => t.id === id));
});

router.patch("/transactions/bulk", (req, res) => {
  const { ids, updates } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  
  transactions = transactions.map(t => ids.includes(t.id) ? { ...t, ...updates } : t);
  res.json({ success: true, updatedCount: ids.length });
});

router.delete("/transactions/:id", (req, res) => {
  const { id } = req.params;
  transactions = transactions.filter(t => t.id !== id);
  res.status(204).send();
});

// Accounts
router.get("/accounts", (req, res) => {
  res.json(accounts);
});

router.post("/accounts", (req, res) => {
  const newAccount = { id: `acc-${Date.now()}`, ...req.body };
  accounts = [...accounts, newAccount];
  res.status(201).json(newAccount);
});

router.put("/accounts/:id", (req, res) => {
  const { id } = req.params;
  accounts = accounts.map(a => a.id === id ? { ...a, ...req.body } : a);
  res.json(accounts.find(a => a.id === id));
});

router.delete("/accounts/:id", (req, res) => {
  const { id } = req.params;
  accounts = accounts.filter(a => a.id !== id);
  res.status(204).send();
});

// Budgets
router.get("/budgets", (req, res) => {
  res.json(budgets);
});

router.post("/budgets", (req, res) => {
  const newBudget = { id: `budget-${Date.now()}`, ...req.body };
  budgets = [...budgets, newBudget];
  res.status(201).json(newBudget);
});

router.put("/budgets/:id", (req, res) => {
  const { id } = req.params;
  budgets = budgets.map(b => b.id === id ? { ...b, ...req.body } : b);
  res.json(budgets.find(b => b.id === id));
});

router.delete("/budgets/:id", (req, res) => {
  const { id } = req.params;
  budgets = budgets.filter(b => b.id !== id);
  res.status(204).send();
});

// Loans
router.get("/loans", (req, res) => {
  res.json(loans);
});

router.post("/loans", (req, res) => {
  const newLoan = { id: `loan-${Date.now()}`, ...req.body };
  loans = [...loans, newLoan];
  res.status(201).json(newLoan);
});

router.put("/loans/:id", (req, res) => {
  const { id } = req.params;
  loans = loans.map(l => l.id === id ? { ...l, ...req.body } : l);
  res.json(loans.find(l => l.id === id));
});

router.delete("/loans/:id", (req, res) => {
  const { id } = req.params;
  loans = loans.filter(l => l.id !== id);
  res.status(204).send();
});

// Savings Goals
router.get("/savings-goals", (req, res) => {
  res.json(savingsGoals);
});

router.post("/savings-goals", (req, res) => {
  const newGoal = { id: `goal-${Date.now()}`, ...req.body };
  savingsGoals = [...savingsGoals, newGoal];
  res.status(201).json(newGoal);
});

router.put("/savings-goals/:id", (req, res) => {
  const { id } = req.params;
  savingsGoals = savingsGoals.map(g => g.id === id ? { ...g, ...req.body } : g);
  res.json(savingsGoals.find(g => g.id === id));
});

router.delete("/savings-goals/:id", (req, res) => {
  const { id } = req.params;
  savingsGoals = savingsGoals.filter(g => g.id !== id);
  res.status(204).send();
});

// Recurring Payments
router.get("/recurring-payments", (req, res) => {
  res.json(recurringPayments);
});

router.post("/recurring-payments", (req, res) => {
  const newPayment = { id: `rec-${Date.now()}`, ...req.body };
  recurringPayments = [...recurringPayments, newPayment];
  res.status(201).json(newPayment);
});

router.put("/recurring-payments/:id", (req, res) => {
  const { id } = req.params;
  recurringPayments = recurringPayments.map(p => p.id === id ? { ...p, ...req.body } : p);
  res.json(recurringPayments.find(p => p.id === id));
});

router.delete("/recurring-payments/:id", (req, res) => {
  const { id } = req.params;
  recurringPayments = recurringPayments.filter(p => p.id !== id);
  res.status(204).send();
});

// Income Sources
router.get("/income-sources", (req, res) => {
  res.json(incomeSources);
});

router.post("/income-sources", (req, res) => {
  const newIncome = { id: `income-${Date.now()}`, ...req.body };
  incomeSources = [...incomeSources, newIncome];
  res.status(201).json(newIncome);
});

router.put("/income-sources/:id", (req, res) => {
  const { id } = req.params;
  incomeSources = incomeSources.map(i => i.id === id ? { ...i, ...req.body } : i);
  res.json(incomeSources.find(i => i.id === id));
});

router.delete("/income-sources/:id", (req, res) => {
  const { id } = req.params;
  incomeSources = incomeSources.filter(i => i.id !== id);
  res.status(204).send();
});

export { router as financeRouter };
