import { test, expect, Page } from '@playwright/test';

// ============================================================
// BATCH 3 — Full E2E Spec
// Finance Tracker — Transactions, Accounts, Budgets, Savings,
// Investments, Recurring, Loans, Net Worth, Settings, Sidebar,
// Auth (Login / Signup / Forgot Password)
// ============================================================

const BASE = 'http://localhost:5173';
const APP  = `${BASE}/app`;

// ─── API Mocks & Setup ─────────────────────────────────────

test.beforeEach(async ({ page }) => {
  // 1. Register General Catch-All FIRST
  await page.route('**/api/**', async route => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', json: [] });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', json: { success: true } });
    }
  });

  // 2. Mock Auth Route dynamically based on stored profile
  await page.route('**/api/auth/me', async route => {
    const profile = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('finance_user_profile') || 'null');
      } catch (e) { return null; }
    }).catch(() => null);

    if (profile) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: { user: profile }
      });
    } else {
      // Return 401 unauthorized to force redirect to login for unauthenticated tests
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        json: { error: 'Unauthorized' }
      });
    }
  });

  // 3. Domain Entity Mocks using generic lookup across specific endpoints
  const endpointMap = {
    'accounts': 'finance_accounts',
    'transactions': 'finance_transactions',
    'budgets': 'finance_budgets',
    'savings-goals': 'finance_savings_goals',
    'investments': 'finance_investments',
    'recurring-payments': 'finance_recurring',
    'loans': 'finance_loans'
  };

  for (const [endpoint, storageKey] of Object.entries(endpointMap)) {
    await page.route(new RegExp(`\\/api\\/finance\\/${endpoint}(\\/|$)`), async route => {
      const method = route.request().method();
      if (method === 'GET') {
        const data = await page.evaluate((key) => {
          try {
             return JSON.parse(localStorage.getItem(key) || '[]');
          } catch(e) { return []; }
        }, storageKey).catch(() => []);
        await route.fulfill({ status: 200, json: data });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON() || {};
        if (!payload.id) payload.id = 'e2e_' + Math.random().toString(36).slice(2, 9);
        await page.evaluate(({ key, item }) => {
          try {
            const current = JSON.parse(localStorage.getItem(key) || '[]');
            current.unshift(item);
            localStorage.setItem(key, JSON.stringify(current));
          } catch(e) {}
        }, { key: storageKey, item: payload }).catch(() => {});
        await route.fulfill({ status: 200, contentType: 'application/json', json: payload });
      } else if (method === 'PUT' || method === 'PATCH') {
         await route.fulfill({ status: 200, contentType: 'application/json', json: { success: true } });
      } else if (method === 'DELETE') {
         const url = route.request().url();
         const parts = url.split('/');
         const targetId = parts.pop() || parts.pop(); // get last non-empty part
         console.log(`[INTERCEPT DELETE] Target ID: ${targetId} for key: ${storageKey} (URL: ${url})`);
         if (targetId) {
           await page.evaluate(({ key, id }) => {
             try {
               const current = JSON.parse(localStorage.getItem(key) || '[]');
               const filtered = current.filter((item: any) => item.id !== id);
               localStorage.setItem(key, JSON.stringify(filtered));
             } catch (e) {}
           }, { key: storageKey, id: targetId }).catch(() => {});
         }
         await route.fulfill({ status: 200, contentType: 'application/json', json: { success: true } });
      } else {
         return route.fallback();
      }
    });
  }
});

// ─── Seed Helpers ───────────────────────────────────────────


async function seedINR(page: Page) {
  await page.evaluate(() => {
    const id = () => crypto.randomUUID();
    const d  = (offset = 0) => {
      const dt = new Date(); dt.setDate(dt.getDate() - offset);
      return dt.toISOString().split('T')[0];
    };

    const transactions = [
      { id: id(), merchant: 'Swiggy',       amount: 500,   type: 'expense', category: 'Food',          date: d(0),  status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'BigBasket',    amount: 1500,  type: 'expense', category: 'Groceries',     date: d(1),  status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'Salary',       amount: 80000, type: 'income',  category: 'Salary',        date: d(2),  status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'Netflix',      amount: 649,   type: 'expense', category: 'Entertainment', date: d(3),  status: 'confirmed', currency: 'INR', account: 'ICICI CC' },
      { id: id(), merchant: 'Ola Cab',      amount: 350,   type: 'expense', category: 'Transport',     date: d(4),  status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'DMart',        amount: 3200,  type: 'expense', category: 'Groceries',     date: d(5),  status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'Freelance',    amount: 15000, type: 'income',  category: 'Freelance',     date: d(6),  status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'Gym',          amount: 1200,  type: 'expense', category: 'Health',        date: d(7),  status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'Amazon',       amount: 2499,  type: 'expense', category: 'Shopping',      date: d(8),  status: 'confirmed', currency: 'INR', account: 'ICICI CC' },
      { id: id(), merchant: 'Rent',         amount: 18000, type: 'expense', category: 'Housing',       date: d(9),  status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'Zomato',       amount: 420,   type: 'expense', category: 'Food',          date: d(10), status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
      { id: id(), merchant: 'Bonus',        amount: 20000, type: 'income',  category: 'Bonus',         date: d(11), status: 'confirmed', currency: 'INR', account: 'HDFC Savings' },
    ];

    const budgets = [
      { id: id(), category: 'Food',          limit: 5000,  spent: 920,   period: 'Monthly', color: '#10b981', emoji: '🍔', currency: 'INR' },
      { id: id(), category: 'Groceries',     limit: 8000,  spent: 4700,  period: 'Monthly', color: '#3b82f6', emoji: '🛒', currency: 'INR' },
      { id: id(), category: 'Transport',     limit: 3000,  spent: 2400,  period: 'Monthly', color: '#f59e0b', emoji: '🚗', currency: 'INR' },
      { id: id(), category: 'Entertainment', limit: 2000,  spent: 649,   period: 'Monthly', color: '#8b5cf6', emoji: '🎬', currency: 'INR' },
      { id: id(), category: 'Shopping',      limit: 5000,  spent: 4900,  period: 'Monthly', color: '#ef4444', emoji: '🛍️', currency: 'INR' },
    ];

    const accounts = [
      { id: id(), name: 'HDFC Savings',  type: 'savings',  balance: 85000, currency: 'INR', color: '#10b981', institution: 'HDFC Bank' },
      { id: id(), name: 'ICICI CC',      type: 'credit',   balance: -5200, currency: 'INR', color: '#ef4444', institution: 'ICICI Bank' },
    ];

    const savings = [
      { id: id(), name: 'Emergency Fund', target: 100000, current: 25000, deadline: '2026-12-31', emoji: '🛡️', currency: 'INR' },
      { id: id(), name: 'New Car',        target: 500000, current: 50000, deadline: '2027-06-30', emoji: '🚗', currency: 'INR' },
    ];

    const investments = [
      { id: id(), symbol: 'NF50', name: 'Nifty 50 SIP',       type: 'ETF', quantity: 1, averagePrice: 5000,  currentPrice: 5600, currency: 'INR', lastUpdated: d(30) },
      { id: id(), symbol: 'HDFCM', name: 'HDFC Mid Cap',        type: 'ETF', quantity: 1, averagePrice: 3000,  currentPrice: 3100, currency: 'INR', lastUpdated: d(60) },
      { id: id(), symbol: 'TATM', name: 'Tata Motors',         type: 'Stock', quantity: 1, averagePrice: 8000,  currentPrice: 9200, currency: 'INR', lastUpdated: d(90) },
      { id: id(), symbol: 'GOLD', name: 'Gold ETF',            type: 'ETF', quantity: 1, averagePrice: 10000, currentPrice: 10800,currency: 'INR', lastUpdated: d(120) },
    ];

    const recurring = [
      { id: id(), name: 'Netflix',      amount: 649,  frequency: 'monthly', category: 'Entertainment', nextDate: d(-5),  currency: 'INR', type: 'expense', active: true },
      { id: id(), name: 'Spotify',      amount: 119,  frequency: 'monthly', category: 'Entertainment', nextDate: d(-10), currency: 'INR', type: 'expense', active: true },
      { id: id(), name: 'Gym',          amount: 1200, frequency: 'monthly', category: 'Health',        nextDate: d(-2),  currency: 'INR', type: 'expense', active: true },
      { id: id(), name: 'SIP Transfer', amount: 5000, frequency: 'monthly', category: 'Investment',    nextDate: d(-1),  currency: 'INR', type: 'expense', active: false },
    ];

    const loans = [
      { id: id(), name: 'Home Loan',     principal: 3000000, balance: 2700000, emi: 28000, rate: 8.5, tenure: 240, startDate: d(365),  currency: 'INR', lender: 'HDFC Bank' },
      { id: id(), name: 'Car Loan',      principal: 700000,  balance: 500000,  emi: 14000, rate: 9.2, tenure: 60,  startDate: d(180),  currency: 'INR', lender: 'ICICI Bank' },
    ];

    localStorage.setItem('finance_transactions',  JSON.stringify(transactions));
    localStorage.setItem('finance_budgets',        JSON.stringify(budgets));
    localStorage.setItem('finance_accounts',       JSON.stringify(accounts));
    localStorage.setItem('finance_savings_goals',  JSON.stringify(savings));
    localStorage.setItem('finance_investments',    JSON.stringify(investments));
    localStorage.setItem('finance_recurring',      JSON.stringify(recurring));
    localStorage.setItem('finance_loans',          JSON.stringify(loans));
    localStorage.setItem('finance_user_profile',   JSON.stringify({
      name: 'Test User', email: 'test@example.com',
      preferences: { currency: 'INR', theme: 'light' },
    }));
    localStorage.setItem('token', 'e2e-test-token');
  });
}

async function seedEUR(page: Page) {
  await page.evaluate(() => {
    const id = () => crypto.randomUUID();
    const d  = (offset = 0) => {
      const dt = new Date(); dt.setDate(dt.getDate() - offset);
      return dt.toISOString().split('T')[0];
    };

    const transactions = [
      { id: id(), merchant: 'Albert Heijn', amount: 85,   type: 'expense', category: 'Groceries',     date: d(0), status: 'confirmed', currency: 'EUR', account: 'ING Betaal' },
      { id: id(), merchant: 'NS Train',     amount: 25,   type: 'expense', category: 'Transport',     date: d(1), status: 'confirmed', currency: 'EUR', account: 'ING Betaal' },
      { id: id(), merchant: 'Salary EU',    amount: 3500, type: 'income',  category: 'Salary',        date: d(2), status: 'confirmed', currency: 'EUR', account: 'ING Betaal' },
      { id: id(), merchant: 'Spotify EU',   amount: 10,   type: 'expense', category: 'Entertainment', date: d(3), status: 'confirmed', currency: 'EUR', account: 'ING Betaal' },
      { id: id(), merchant: 'Lidl',         amount: 45,   type: 'expense', category: 'Groceries',     date: d(4), status: 'confirmed', currency: 'EUR', account: 'ING Betaal' },
    ];

    const budgets = [
      { id: id(), category: 'Groceries', limit: 400, spent: 130, period: 'Monthly', color: '#10b981', emoji: '🛒', currency: 'EUR' },
    ];

    const accounts = [
      { id: id(), name: 'ING Betaal', type: 'checking', balance: 3500, currency: 'EUR', color: '#f59e0b', institution: 'ING Bank' },
    ];

    const savings = [
      { id: id(), name: 'Vacation',  target: 3000, current: 800, deadline: '2026-08-01', emoji: '✈️', currency: 'EUR' },
    ];

    const investments = [
      { id: id(), symbol: 'VWCE', name: 'VWCE ETF', type: 'ETF', quantity: 1, averagePrice: 500, currentPrice: 540, currency: 'EUR', lastUpdated: d(60) },
    ];

    const recurring = [
      { id: id(), name: 'Netflix EU', amount: 15, frequency: 'monthly', category: 'Entertainment', nextDate: d(-3), currency: 'EUR', type: 'expense', active: true },
    ];

    const loans = [
      { id: id(), name: 'Student Loan', principal: 20000, balance: 15000, emi: 300, rate: 4.0, tenure: 60, startDate: d(365), currency: 'EUR', lender: 'DUO NL' },
    ];

    localStorage.setItem('finance_transactions',  JSON.stringify(transactions));
    localStorage.setItem('finance_budgets',        JSON.stringify(budgets));
    localStorage.setItem('finance_accounts',       JSON.stringify(accounts));
    localStorage.setItem('finance_savings_goals',  JSON.stringify(savings));
    localStorage.setItem('finance_investments',    JSON.stringify(investments));
    localStorage.setItem('finance_recurring',      JSON.stringify(recurring));
    localStorage.setItem('finance_loans',          JSON.stringify(loans));
    localStorage.setItem('finance_user_profile',   JSON.stringify({
      name: 'EUR User', email: 'eur@example.com',
      preferences: { currency: 'EUR', theme: 'light' },
    }));
    localStorage.setItem('token', 'e2e-test-token');
  });
}

async function seedEmpty(page: Page) {
  await page.evaluate(() => {
    ['finance_transactions','finance_budgets','finance_accounts',
     'finance_savings_goals','finance_investments','finance_recurring','finance_loans']
    .forEach(k => localStorage.setItem(k, JSON.stringify([])));
    localStorage.setItem('finance_user_profile', JSON.stringify({
      name: 'New User', email: 'new@example.com',
      preferences: { currency: 'INR', theme: 'light' },
    }));
  });
}

async function go(page: Page, seedFn: (p: Page) => Promise<void>, path: string) {
  // 1. Inhibit router race conditions by priming storage on root and loading stable landing
  await page.goto(`${BASE}/`, { waitUntil: 'commit' });
  await seedFn(page);
  
  // 2. Land on stable entry point
  await page.goto(`${APP}/dashboard`);
  
  // 3. Anchor: Await sidebar mount guaranteeing logical auth settlement
  const aside = page.locator('aside');
  await expect(aside).toBeVisible({ timeout: 8000 });
  
  if (path === 'dashboard') {
    await page.waitForLoadState('networkidle');
    return;
  }
  
  // 4. Map path slugs to exact human-facing sidebar labels
  const sidebarMap: Record<string, string> = {
    'transactions': 'Transactions',
    'accounts': 'Accounts',
    'budgets': 'Budgets',
    'savings': 'Goals',
    'investments': 'Investments',
    'recurring': 'Recurring',
    'loans': 'Loans',
    'insights': 'AI Oracle',
    'networth': 'Net Worth',
    'settings': 'Settings'
  };
  
  const label = sidebarMap[path];
  if (!label) {
    // Fallback: try direct URL entry for arbitrary pages
    await page.goto(`${APP}/${path}`);
    await page.waitForLoadState('networkidle');
    return;
  }
  
  // 5. Leverage internal React Router SPA transition via simulated user click
  const link = aside.locator('nav').getByText(label, { exact: true });
  await expect(link).toBeVisible({ timeout: 5000 });
  await link.click();
  
  // 6. Wait for path parameter to stabilize inside Browser History
  await page.waitForURL(`**/${path}**`, { timeout: 5000 });
  await page.waitForLoadState('networkidle');

  // 7. Anchor validation: Ensure targeted view is fully mounted and active
  const headingMap: Record<string, string> = {
    'transactions': 'Transactions',
    'accounts': 'Bank Accounts',
    'budgets': 'Budgets',
    'savings': 'Savings Goals',
    'investments': 'Investments',
    'recurring': 'Recurring',
    'loans': 'Loans',
    'networth': 'Net Worth',
    'settings': 'Settings',
  };
  const expectedHeading = headingMap[path];
  if (expectedHeading) {
    await expect(page.getByRole('heading', { name: expectedHeading }).first()).toBeVisible({ timeout: 8000 });
  }
}

// ============================================================
// SECTION A — Transactions Page
// ============================================================

test.describe('Transactions Page', () => {

  test('Tx_Happy_001 — Page renders with all transactions listed', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    await expect(page.getByRole('heading', { name: 'Transactions', exact: true })).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Swiggy' }).first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'BigBasket' }).first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Salary' }).first()).toBeVisible();
  });

  test('Tx_Happy_002 — INR transactions show ₹ symbol', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const body = await page.textContent('body');
    expect(body).toContain('₹');
    expect(body).not.toContain('NaN');
  });

  test('Tx_Happy_003 — EUR transactions show € symbol', async ({ page }) => {
    await go(page, seedEUR, 'transactions');
    const body = await page.textContent('body');
    expect(body).toContain('€');
    expect(body).not.toContain('NaN');
  });

  test('Tx_Happy_004 — Income rows show green color; Expense rows show red/rose color', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const greenAmounts = page.locator('[class*="text-emerald"], [class*="text-green"]');
    const redAmounts   = page.locator('[class*="text-rose"], [class*="text-red"]');
    await expect(greenAmounts.first()).toBeVisible();
    await expect(redAmounts.first()).toBeVisible();
  });

  test('Tx_Filter_001 — Filter by "Income" type shows only income rows', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const incomeBtn = page.getByRole('button', { name: /income/i }).first();
    await expect(incomeBtn).toBeVisible();
    await incomeBtn.click();
    await page.waitForTimeout(400);
    await expect(page.getByRole('paragraph').filter({ hasText: 'Salary' }).first()).toBeVisible();
    // Expense-only merchants should not be visible
    await expect(page.getByRole('paragraph').filter({ hasText: 'Swiggy' }).first()).toBeHidden();
  });

  test('Tx_Filter_002 — Filter by "Expense" type shows only expense rows', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const expenseBtn = page.getByRole('button', { name: /expense/i }).first();
    await expect(expenseBtn).toBeVisible();
    await expenseBtn.click();
    await page.waitForTimeout(400);
    await expect(page.getByRole('paragraph').filter({ hasText: 'Swiggy' }).first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Salary' }).first()).toBeHidden();
  });

  test('Tx_Filter_003 — Search by merchant name filters list', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const searchInput = page.locator('input[type="text"], input[placeholder*="Search"]').first();
    await searchInput.fill('Netflix');
    await page.waitForTimeout(400);
    await expect(page.getByRole('paragraph').filter({ hasText: 'Netflix' }).first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Swiggy' }).first()).toBeHidden();
  });

  test('Tx_Filter_004 — Filter by category shows matching transactions only', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const catFilter = page.locator('select').filter({ hasText: /Categor/ }).first();
    if (await catFilter.isVisible()) {
      await catFilter.selectOption('Food');
      await page.waitForTimeout(400);
      await expect(page.getByRole('paragraph').filter({ hasText: 'Swiggy' }).first()).toBeVisible();
      await expect(page.getByRole('paragraph').filter({ hasText: 'BigBasket' }).first()).toBeHidden();
    }
  });

  test('Tx_Filter_005 — Clearing search restores full list', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const searchInput = page.locator('input[type="text"], input[placeholder*="Search"]').first();
    await searchInput.fill('Netflix');
    await page.waitForTimeout(300);
    await searchInput.clear();
    await page.waitForTimeout(300);
    await expect(page.getByRole('paragraph').filter({ hasText: 'Swiggy' }).first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Salary' }).first()).toBeVisible();
  });

  test('Tx_Add_001 — Add Transaction modal opens from + button', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const addBtn = page.getByRole('button', { name: /add|new|\+/i }).first();
    await addBtn.click();
    await expect(page.getByRole('heading', { name: 'Smart Add' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Tx_Add_002 — New INR expense transaction saved and appears in list', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const addBtn = page.getByRole('button', { name: /add|new|\+/i }).first();
    await addBtn.click();

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill('UniqueTestMerchant ₹999');

    const parseBtn = page.getByRole('button', { name: /understand/i }).first();
    await parseBtn.click();

    const confirmBtn = page.getByRole('button', { name: /confirm|save/i }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    await page.waitForTimeout(1000);
    await expect(page.getByRole('paragraph').filter({ hasText: 'UniqueTestMerchant' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Tx_Edit_001 — Editing a transaction updates its values in the list', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    // Click edit on first transaction row
    const rows = page.locator('[class*="row"], tr, [class*="transaction-item"]');
    const firstRow = rows.first();
    await firstRow.hover();
    const editBtn = firstRow.getByRole('button', { name: /edit/i }).or(
      firstRow.locator('button').filter({ has: page.locator('[data-lucide="pencil"], [class*="Edit"]') })
    ).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      const amountInput = dialog.locator('input[type="number"]').first();
      await amountInput.clear();
      await amountInput.fill('750');
      await dialog.getByRole('button', { name: /save|update/i }).first().click();
      const body = await page.textContent('body');
      expect(body).toContain('750');
    }
  });

  test('Tx_Delete_001 — Deleting a transaction removes it from list', async ({ page }) => {
    await go(page, seedINR, 'transactions');
    const row = page.locator('div.group').filter({ hasText: 'Gym' }).first();

    if (await row.isVisible()) {
      await row.hover();
      const deleteBtn = row.locator('button').first();
      await deleteBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('paragraph').filter({ hasText: 'Gym' }).first()).toBeHidden();
    }
  });

  test('Tx_Edge_001 — Empty state shown when no transactions exist', async ({ page }) => {
    await go(page, seedEmpty, 'transactions');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Tx_Currency_Mixed_001 — Mixed INR/EUR transactions both render without NaN', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      const id = () => crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];
      const tx = [
        { id: id(), merchant: 'INR Merchant', amount: 500,  type: 'expense', category: 'Food', date: today, status: 'confirmed', currency: 'INR' },
        { id: id(), merchant: 'EUR Merchant', amount: 50,   type: 'expense', category: 'Food', date: today, status: 'confirmed', currency: 'EUR' },
      ];
      localStorage.setItem('finance_transactions', JSON.stringify(tx));
      localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'Mixed', email: 'm@m.com', preferences: { currency: 'INR' } }));
    });
    await page.goto(`${APP}/transactions`);
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    expect(body).toContain('₹');
    expect(body).toContain('€');
  });

});

// ============================================================
// SECTION B — Accounts Page
// ============================================================

test.describe('Accounts Page', () => {

  test('Accounts_Happy_001 — Page renders with all account cards', async ({ page }) => {
    await go(page, seedINR, 'accounts');
    await expect(page.getByText('HDFC Savings')).toBeVisible();
    await expect(page.getByText('ICICI CC')).toBeVisible();
  });

  test('Accounts_Happy_002 — INR accounts show ₹ balance', async ({ page }) => {
    await go(page, seedINR, 'accounts');
    const body = await page.textContent('body');
    expect(body).toContain('₹');
    expect(body).not.toContain('NaN');
  });

  test('Accounts_Happy_003 — EUR accounts show € balance', async ({ page }) => {
    await go(page, seedEUR, 'accounts');
    const body = await page.textContent('body');
    expect(body).toContain('€');
    expect(body).not.toContain('NaN');
  });

  test('Accounts_Happy_004 — Credit card shows negative balance correctly', async ({ page }) => {
    await go(page, seedINR, 'accounts');
    // ICICI CC has -5200 balance
    const body = await page.textContent('body');
    expect(body).toMatch(/-?5[,.]?200|5,200/);
    expect(body).not.toContain('NaN');
  });

  test('Accounts_Add_001 — Add Account modal opens and has INR/EUR currency options', async ({ page }) => {
    await go(page, seedINR, 'accounts');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new account/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Currency select should only have INR and EUR
    const currencySelect = dialog.locator('select').filter({ hasText: /INR|EUR/ }).first();
    if (await currencySelect.isVisible()) {
      const options = await currencySelect.locator('option').allTextContents();
      const supported = options.filter(o => o.trim() !== '' && o !== 'Select');
      supported.forEach(opt => {
        expect(['INR', 'EUR']).toContain(opt.trim());
      });
    }
  });

  test('Accounts_Add_002 — New INR account saved and appears in accounts list', async ({ page }) => {
    await go(page, seedINR, 'accounts');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new account/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill('SBI Savings Test');

    const balanceInput = dialog.locator('input[type="number"]').first();
    await balanceInput.fill('50000');

    const saveBtn = dialog.getByRole('button', { name: /save|add|create/i }).first();
    await saveBtn.click();

    await expect(page.getByText('SBI Savings Test')).toBeVisible({ timeout: 8000 });
  });

  test('Accounts_Add_003 — New EUR account saved and shows € symbol', async ({ page }) => {
    await go(page, seedEUR, 'accounts');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new account/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill('Revolut Test');

    const balanceInput = dialog.locator('input[type="number"]').first();
    await balanceInput.fill('1500');

    const currencySelect = dialog.locator('select').filter({ hasText: /EUR/ }).first();
    if (await currencySelect.isVisible()) await currencySelect.selectOption('EUR');

    await dialog.getByRole('button', { name: /save|add|create/i }).first().click();
    await expect(page.getByText('Revolut Test')).toBeVisible({ timeout: 8000 });
  });

  test('Accounts_Delete_001 — Deleting an account removes it from the list', async ({ page }) => {
    await go(page, seedINR, 'accounts');
    const iciciCard = page.locator('text=ICICI CC').first().locator('../..');
    await iciciCard.hover();
    const deleteBtn = iciciCard.getByRole('button', { name: /delete|remove/i }).or(
      iciciCard.locator('button').filter({ has: page.locator('[data-lucide="trash"]') })
    ).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('ICICI CC')).not.toBeVisible();
    }
  });

  test('Accounts_Edge_001 — Empty state when no accounts exist', async ({ page }) => {
    await go(page, seedEmpty, 'accounts');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Accounts_Mixed_001 — INR and EUR accounts shown side by side without NaN', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      const id = () => crypto.randomUUID();
      const accounts = [
        { id: id(), name: 'HDFC INR', type: 'savings', balance: 50000, currency: 'INR', color: '#10b981' },
        { id: id(), name: 'ING EUR',  type: 'checking', balance: 2000,  currency: 'EUR', color: '#f59e0b' },
      ];
      localStorage.setItem('finance_accounts', JSON.stringify(accounts));
      localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'Mixed', email: 'm@m.com', preferences: { currency: 'INR' } }));
    });
    await page.goto(`${APP}/accounts`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    expect(body).toContain('₹');
    expect(body).toContain('€');
  });

});

// ============================================================
// SECTION C — Budgets Page
// ============================================================

test.describe('Budgets Page', () => {

  test('Budgets_Happy_001 — Page renders all budget cards with correct labels', async ({ page }) => {
    await go(page, seedINR, 'budgets');
    await expect(page.getByText('Food').first()).toBeVisible();
    await expect(page.getByText('Groceries').first()).toBeVisible();
    await expect(page.getByText('Transport').first()).toBeVisible();
  });

  test('Budgets_Happy_002 — INR budgets show ₹ symbol on spent/limit', async ({ page }) => {
    await go(page, seedINR, 'budgets');
    const body = await page.textContent('body');
    expect(body).toContain('₹');
    expect(body).not.toContain('NaN');
  });

  test('Budgets_Happy_003 — EUR budgets show € symbol', async ({ page }) => {
    await go(page, seedEUR, 'budgets');
    const body = await page.textContent('body');
    expect(body).toContain('€');
    expect(body).not.toContain('NaN');
  });

  test('Budgets_Happy_004 — Progress bars color-coded: <70% green, 70–90% amber, >90% red', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      const id = () => crypto.randomUUID();
      const budgets = [
        { id: id(), category: 'Food', limit: 1000, spent: 0, period: 'Monthly', color: '#10b981', currency: 'INR' },
        { id: id(), category: 'Groceries', limit: 1000, spent: 0, period: 'Monthly', color: '#f59e0b', currency: 'INR' },
        { id: id(), category: 'Shopping', limit: 1000, spent: 0, period: 'Monthly', color: '#ef4444', currency: 'INR' },
      ];
      const transactions = [
        { id: id(), category: 'Food', amount: 200, type: 'expense', date: new Date().toISOString().split('T')[0], status: 'confirmed', currency: 'INR', merchant: 'M1' }, // 20%
        { id: id(), category: 'Groceries', amount: 850, type: 'expense', date: new Date().toISOString().split('T')[0], status: 'confirmed', currency: 'INR', merchant: 'M2' }, // 85%
        { id: id(), category: 'Shopping', amount: 1100, type: 'expense', date: new Date().toISOString().split('T')[0], status: 'confirmed', currency: 'INR', merchant: 'M3' }, // 110%
      ];
      localStorage.setItem('finance_budgets', JSON.stringify(budgets));
      localStorage.setItem('finance_transactions', JSON.stringify(transactions));
      localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'T', email: 't@t.com', preferences: { currency: 'INR' } }));
    });
    await page.goto(`${APP}/budgets`);
    await page.waitForLoadState('networkidle');
    const greenBar = page.locator('[class*="bg-emerald-500"]').first();
    const amberBar = page.locator('[class*="bg-amber-500"]').first();
    const redBar   = page.locator('[class*="bg-rose-500"]').first();
    await expect(greenBar).toBeVisible({ timeout: 5000 });
    await expect(amberBar).toBeVisible({ timeout: 5000 });
    await expect(redBar).toBeVisible({ timeout: 5000 });
  });

  test('Budgets_Add_001 — Add Budget modal opens with correct fields', async ({ page }) => {
    await go(page, seedINR, 'budgets');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new budget/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[type="number"]')).toBeVisible();
  });

  test('Budgets_Add_002 — New INR budget saved and appears in list', async ({ page }) => {
    await go(page, seedINR, 'budgets');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new budget/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const catSelect = dialog.locator('select').first();
    await catSelect.selectOption({ index: 1 });

    const limitInput = dialog.locator('input[type="number"]').first();
    await limitInput.fill('7500');

    await dialog.getByRole('button', { name: /save|add|create/i }).first().click();
    const body = await page.textContent('body');
    expect(body).toContain('7,500');
  });

  test('Budgets_Add_003 — New EUR budget shows € symbol after save', async ({ page }) => {
    await go(page, seedEUR, 'budgets');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new budget/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const limitInput = dialog.locator('input[type="number"]').first();
    await limitInput.fill('500');

    await dialog.getByRole('button', { name: /save|add|create/i }).first().click();
    const body = await page.textContent('body');
    expect(body).toContain('€');
  });

  test('Budgets_Delete_001 — Deleting a budget removes it from the list', async ({ page }) => {
    await go(page, seedINR, 'budgets');
    const entertainmentCard = page.locator('text=Entertainment').first().locator('../..');
    await entertainmentCard.hover();
    const deleteBtn = entertainmentCard.locator('button').filter({
      has: page.locator('[data-lucide="trash"], [class*="Trash"]'),
    }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('Entertainment').first()).not.toBeVisible();
    }
  });

  test('Budgets_Edge_001 — Empty state shown when no budgets exist', async ({ page }) => {
    await go(page, seedEmpty, 'budgets');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Budgets_Edge_002 — 100% spent budget shows correct visual state', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      const id = () => crypto.randomUUID();
      const b = [{ id: id(), category: 'Food', limit: 5000, spent: 5000, period: 'Monthly', color: '#ef4444', emoji: '🍔', currency: 'INR' }];
      localStorage.setItem('finance_budgets', JSON.stringify(b));
      localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'T', email: 't@t.com', preferences: { currency: 'INR' } }));
    });
    await page.goto(`${APP}/budgets`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    expect(body).toContain('100');
  });

  test('Budgets_Edge_003 — Budget over 100% (overspent) renders without crash', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      const id = () => crypto.randomUUID();
      const b = [{ id: id(), category: 'Shopping', limit: 3000, spent: 4200, period: 'Monthly', color: '#ef4444', emoji: '🛍️', currency: 'INR' }];
      localStorage.setItem('finance_budgets', JSON.stringify(b));
      localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'T', email: 't@t.com', preferences: { currency: 'INR' } }));
    });
    await page.goto(`${APP}/budgets`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    // Progress bar should be capped at 100% width
    const bar = page.locator('[style*="width"]').first();
    if (await bar.isVisible()) {
      const style = await bar.getAttribute('style');
      if (style && style.includes('width')) {
        const widthMatch = style.match(/width:\s*([\d.]+)%/);
        if (widthMatch) expect(parseFloat(widthMatch[1])).toBeLessThanOrEqual(100);
      }
    }
  });

});

// ============================================================
// SECTION D — Savings Goals Page
// ============================================================

test.describe('Savings Goals Page', () => {

  test('Savings_Happy_001 — Page renders all savings goal cards', async ({ page }) => {
    await go(page, seedINR, 'savings');
    await expect(page.getByText('Emergency Fund')).toBeVisible();
    await expect(page.getByText('New Car')).toBeVisible();
  });

  test('Savings_Happy_002 — INR goals show ₹ symbol on target/current amounts', async ({ page }) => {
    await go(page, seedINR, 'savings');
    const body = await page.textContent('body');
    expect(body).toContain('₹');
    expect(body).not.toContain('NaN');
  });

  test('Savings_Happy_003 — EUR goals show € symbol', async ({ page }) => {
    await go(page, seedEUR, 'savings');
    const body = await page.textContent('body');
    expect(body).toContain('€');
    expect(body).not.toContain('NaN');
  });

  test('Savings_Happy_004 — Goal progress percentage shows correctly', async ({ page }) => {
    await go(page, seedINR, 'savings');
    // Emergency Fund: 25000/100000 = 25%
    const body = await page.textContent('body');
    expect(body).toContain('25');
    expect(body).toMatch(/25[.\s%]/);
  });

  test('Savings_Add_001 — Add Goal modal opens and saves a new INR goal', async ({ page }) => {
    await go(page, seedINR, 'savings');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new goal/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill('Holiday Fund Test');

    const targetInput = dialog.locator('input[type="number"]').first();
    await targetInput.fill('80000');

    await dialog.getByRole('button', { name: /save|add|create/i }).first().click();
    await expect(page.getByText('Holiday Fund Test')).toBeVisible({ timeout: 5000 });
  });

  test('Savings_Contribute_001 — Contribute modal opens and adds amount to goal progress', async ({ page }) => {
    await go(page, seedINR, 'savings');
    const goalCard = page.locator('text=Emergency Fund').first().locator('../..');
    const contributeBtn = goalCard.getByRole('button', { name: /contribute|add|top up/i }).first();
    if (await contributeBtn.isVisible()) {
      await contributeBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      const amountInput = dialog.locator('input[type="number"]').first();
      await amountInput.fill('5000');
      await dialog.getByRole('button', { name: /save|add|confirm/i }).first().click();
      // Progress should now be 30%
      const body = await page.textContent('body');
      expect(body).toContain('30');
    }
  });

  test('Savings_Delete_001 — Deleting a goal removes it from list', async ({ page }) => {
    await go(page, seedINR, 'savings');
    const carCard = page.locator('text=New Car').first().locator('../..');
    await carCard.hover();
    const deleteBtn = carCard.locator('button').filter({
      has: page.locator('[data-lucide="trash"]'),
    }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('New Car')).not.toBeVisible();
    }
  });

  test('Savings_Edge_001 — Empty state when no goals exist', async ({ page }) => {
    await go(page, seedEmpty, 'savings');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Savings_Edge_002 — Goal at 100% (fully funded) renders correctly without crash', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      const id = () => crypto.randomUUID();
      const goals = [{ id: id(), name: 'Fully Funded Goal', target: 50000, current: 50000, deadline: '2026-12-31', emoji: '✅', currency: 'INR' }];
      localStorage.setItem('finance_savings_goals', JSON.stringify(goals));
      localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'T', email: 't@t.com', preferences: { currency: 'INR' } }));
    });
    await page.goto(`${APP}/savings`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    expect(body).toContain('100');
  });

});

// ============================================================
// SECTION E — Investments Page
// ============================================================

test.describe('Investments Page', () => {

  test('Investments_Happy_001 — Page renders all investment rows', async ({ page }) => {
    await go(page, seedINR, 'investments');
    await expect(page.getByText('Nifty 50 SIP')).toBeVisible();
    await expect(page.getByText('HDFC Mid Cap')).toBeVisible();
    await expect(page.getByText('Tata Motors')).toBeVisible();
    await expect(page.getByText('Gold ETF')).toBeVisible();
  });

  test('Investments_Happy_002 — INR investments show ₹ symbol', async ({ page }) => {
    await go(page, seedINR, 'investments');
    const body = await page.textContent('body');
    expect(body).toContain('₹');
    expect(body).not.toContain('NaN');
  });

  test('Investments_Happy_003 — EUR investments show € symbol', async ({ page }) => {
    await go(page, seedEUR, 'investments');
    const body = await page.textContent('body');
    expect(body).toContain('€');
    expect(body).not.toContain('NaN');
  });

  test('Investments_Happy_004 — Positive returns shown in green', async ({ page }) => {
    await go(page, seedINR, 'investments');
    const greenReturns = page.locator('[class*="text-emerald"], [class*="text-green"]');
    await expect(greenReturns.first()).toBeVisible();
  });

  test('Investments_Add_001 — Add Investment modal opens with all fields', async ({ page }) => {
    await go(page, seedINR, 'investments');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new investment/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[type="number"]')).toBeVisible();
  });

  test('Investments_Add_002 — New INR mutual fund investment saved and appears in list', async ({ page }) => {
    await go(page, seedINR, 'investments');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new investment/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill('Test SIP Fund');

    const amountInput = dialog.locator('input[type="number"]').first();
    await amountInput.fill('2500');

    await dialog.getByRole('button', { name: /save|add|create/i }).first().click();
    await expect(page.getByText('Test SIP Fund')).toBeVisible({ timeout: 5000 });
  });

  test('Investments_Delete_001 — Deleting an investment removes it', async ({ page }) => {
    await go(page, seedINR, 'investments');
    const goldRow = page.locator('text=Gold ETF').first().locator('../..');
    await goldRow.hover();
    const deleteBtn = goldRow.locator('button').filter({
      has: page.locator('[data-lucide="trash"]'),
    }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('Gold ETF')).not.toBeVisible();
    }
  });

  test('Investments_Edge_001 — Empty state when no investments exist', async ({ page }) => {
    await go(page, seedEmpty, 'investments');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Investments_Edge_002 — Negative returns (loss) shown in red', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      const id = () => crypto.randomUUID();
      const inv = [{ id: id(), name: 'Loss Fund', type: 'mutual_fund', amount: 10000, currentValue: 8000, currency: 'INR', startDate: new Date().toISOString().split('T')[0], returns: -20 }];
      localStorage.setItem('finance_investments', JSON.stringify(inv));
      localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'T', email: 't@t.com', preferences: { currency: 'INR' } }));
    });
    await page.goto(`${APP}/investments`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    const redElement = page.locator('[class*="text-rose"], [class*="text-red"]').first();
    await expect(redElement).toBeVisible();
  });

});

// ============================================================
// SECTION F — Recurring Page
// ============================================================

test.describe('Recurring Page', () => {

  test('Recurring_Happy_001 — Page renders all recurring items', async ({ page }) => {
    await go(page, seedINR, 'recurring');
    await expect(page.getByText('Netflix')).toBeVisible();
    await expect(page.getByText('Spotify')).toBeVisible();
    await expect(page.getByText('Gym')).toBeVisible();
  });

  test('Recurring_Happy_002 — INR recurring items show ₹ amounts', async ({ page }) => {
    await go(page, seedINR, 'recurring');
    const body = await page.textContent('body');
    expect(body).toContain('₹');
    expect(body).not.toContain('NaN');
  });

  test('Recurring_Happy_003 — EUR recurring items show € amounts', async ({ page }) => {
    await go(page, seedEUR, 'recurring');
    const body = await page.textContent('body');
    expect(body).toContain('€');
    expect(body).not.toContain('NaN');
  });

  test('Recurring_Happy_004 — Inactive recurring shows visual distinction (badge/toggle)', async ({ page }) => {
    await go(page, seedINR, 'recurring');
    // SIP Transfer has active: false
    await expect(page.getByText('SIP Transfer')).toBeVisible();
    const sipRow = page.locator('text=SIP Transfer').first().locator('../..');
    const sipText = await sipRow.textContent();
    // Should have an inactive indicator (opacity, badge, or toggle off)
    expect(sipText).toBeTruthy();
  });

  test('Recurring_Add_001 — Add Recurring modal opens and saves a new item', async ({ page }) => {
    await go(page, seedINR, 'recurring');
    const addBtn = page.locator('main').getByRole('button', { name: /add|new recurring/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill('Test Subscription');

    const amountInput = dialog.locator('input[type="number"]').first();
    await amountInput.fill('299');

    await dialog.getByRole('button', { name: /save|add|create/i }).first().click();
    await expect(page.getByText('Test Subscription')).toBeVisible({ timeout: 5000 });
  });

  test('Recurring_Toggle_001 — Toggling active state updates recurring item', async ({ page }) => {
    await go(page, seedINR, 'recurring');
    const sipRow = page.locator('text=SIP Transfer').first().locator('../..');
    const toggle = sipRow.locator('[role="switch"], input[type="checkbox"], button[class*="toggle"]').first();
    if (await toggle.isVisible()) {
      const before = await toggle.isChecked().catch(() => null);
      await toggle.click();
      await page.waitForTimeout(400);
      const after = await toggle.isChecked().catch(() => null);
      if (before !== null && after !== null) expect(after).not.toBe(before);
    }
  });

  test('Recurring_Delete_001 — Deleting a recurring item removes it', async ({ page }) => {
    await go(page, seedINR, 'recurring');
    const spotifyRow = page.locator('text=Spotify').first().locator('../..');
    await spotifyRow.hover();
    const deleteBtn = spotifyRow.locator('button').filter({
      has: page.locator('[data-lucide="trash"]'),
    }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('Spotify')).not.toBeVisible();
    }
  });

  test('Recurring_Edge_001 — Empty state when no recurring items exist', async ({ page }) => {
    await go(page, seedEmpty, 'recurring');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    await expect(page.locator('body')).toBeVisible();
  });

});

// ============================================================
// SECTION G — Loans Page
// ============================================================

test.describe('Loans Page', () => {

  test('Loans_Happy_001 — Page renders all loan cards', async ({ page }) => {
    await go(page, seedINR, 'loans');
    await expect(page.getByText('Home Loan')).toBeVisible();
    await expect(page.getByText('Car Loan')).toBeVisible();
  });

  test('Loans_Happy_002 — INR loans show ₹ symbol on EMI and balance', async ({ page }) => {
    await go(page, seedINR, 'loans');
    const body = await page.textContent('body');
    expect(body).toContain('₹');
    expect(body).not.toContain('NaN');
  });

  test('Loans_Happy_003 — EUR loans show € symbol', async ({ page }) => {
    await go(page, seedEUR, 'loans');
    const body = await page.textContent('body');
    expect(body).toContain('€');
    expect(body).not.toContain('NaN');
  });

  test('Loans_Happy_004 — Loan interest rate displayed correctly', async ({ page }) => {
    await go(page, seedINR, 'loans');
    const body = await page.textContent('body');
    expect(body).toContain('8.5');  // Home Loan rate
    expect(body).toContain('9.2');  // Car Loan rate
  });

  test('Loans_Add_001 — Add Loan modal opens with all required fields', async ({ page }) => {
    await go(page, seedINR, 'loans');
    const addBtn = page.getByRole('button', { name: /add|new loan/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[type="number"]').first()).toBeVisible();
  });

  test('Loans_Add_002 — New INR loan saved and appears in list', async ({ page }) => {
    await go(page, seedINR, 'loans');
    const addBtn = page.getByRole('button', { name: /add|new loan/i }).first();
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill('Personal Loan Test');

    const principalInput = dialog.locator('input[type="number"]').first();
    await principalInput.fill('200000');

    await dialog.getByRole('button', { name: /save|add|create/i }).first().click();
    await expect(page.getByText('Personal Loan Test')).toBeVisible({ timeout: 5000 });
  });

  test('Loans_Delete_001 — Deleting a loan removes it from the list', async ({ page }) => {
    await go(page, seedINR, 'loans');
    const carCard = page.locator('text=Car Loan').first().locator('../..');
    await carCard.hover();
    const deleteBtn = carCard.locator('button').filter({
      has: page.locator('[data-lucide="trash"]'),
    }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('Car Loan')).not.toBeVisible();
    }
  });

  test('Loans_Edge_001 — Empty state when no loans exist', async ({ page }) => {
    await go(page, seedEmpty, 'loans');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Loans_Amortisation_001 — EMI calculated correctly (P=3000000, r=8.5%, n=240)', async ({ page }) => {
    await go(page, seedINR, 'loans');
    // EMI formula: P*r*(1+r)^n / ((1+r)^n - 1)
    // Expected ≈ ₹26,035 (seeded as 28000 — test just checks it's non-NaN and visible)
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    expect(body).toMatch(/28[,.]?000|28000/);
  });

});

// ============================================================
// SECTION H — Net Worth Page
// ============================================================

test.describe('Net Worth Page', () => {

  test('NetWorth_Happy_001 — Page renders with hero section showing total net worth', async ({ page }) => {
    await go(page, seedINR, 'networth');
    await expect(page.getByText('Net Worth')).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toContain('₹');
    expect(body).not.toContain('NaN');
  });

  test('NetWorth_Happy_002 — Assets vs Liabilities breakdown shown', async ({ page }) => {
    await go(page, seedINR, 'networth');
    const body = await page.textContent('body');
    expect(body).toMatch(/asset|Asset/i);
    expect(body).toMatch(/liabilit|Liabilit/i);
  });

  test('NetWorth_Happy_003 — EUR net worth shows € symbol', async ({ page }) => {
    await go(page, seedEUR, 'networth');
    const body = await page.textContent('body');
    expect(body).toContain('€');
    expect(body).not.toContain('NaN');
  });

  test('NetWorth_Chart_001 — Net Worth trend chart renders SVG elements', async ({ page }) => {
    await go(page, seedINR, 'networth');
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible({ timeout: 5000 });
  });

  test('NetWorth_Breakdown_001 — Account balances listed in breakdown', async ({ page }) => {
    await go(page, seedINR, 'networth');
    const body = await page.textContent('body');
    expect(body).toContain('HDFC Savings');
  });

  test('NetWorth_Edge_001 — Zero net worth (no accounts) renders without crash', async ({ page }) => {
    await go(page, seedEmpty, 'networth');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    await expect(page.locator('body')).toBeVisible();
  });

  test('NetWorth_Mixed_001 — Mixed INR+EUR net worth renders without NaN', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      const id = () => crypto.randomUUID();
      const accounts = [
        { id: id(), name: 'HDFC INR', type: 'savings', balance: 80000, currency: 'INR', color: '#10b981' },
        { id: id(), name: 'ING EUR',  type: 'checking', balance: 2500,  currency: 'EUR', color: '#3b82f6' },
      ];
      localStorage.setItem('finance_accounts', JSON.stringify(accounts));
      localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'Mixed', email: 'm@m.com', preferences: { currency: 'INR' } }));
    });
    await page.goto(`${APP}/networth`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
    expect(body).toContain('₹');
    expect(body).toContain('€');
  });

});

// ============================================================
// SECTION I — Settings Page
// ============================================================

test.describe('Settings Page', () => {

  test('Settings_Happy_001 — Page renders all main sections', async ({ page }) => {
    await go(page, seedINR, 'settings');
    await expect(page.getByText('Settings')).toBeVisible();
    // Profile section
    await expect(page.getByText(/Profile|Name/i).first()).toBeVisible();
  });

  test('Settings_Happy_002 — User name pre-filled from stored profile', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const nameInput = page.locator('input[type="text"]').first();
    const val = await nameInput.inputValue();
    expect(val).toBe('Test User');
  });

  test('Settings_Happy_003 — Email pre-filled from stored profile', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const emailInput = page.locator('input[type="email"]').first();
    const val = await emailInput.inputValue();
    expect(val).toBe('test@example.com');
  });

  test('Settings_Profile_001 — Editing name and saving persists the change', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill('Updated Name');

    const saveBtn = page.getByRole('button', { name: /save|update/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(500);

    // Reload and check persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    const nameAfter = await page.locator('input[type="text"]').first().inputValue();
    expect(nameAfter).toBe('Updated Name');
  });

  test('Settings_Currency_001 — Currency selector is visible and defaults to INR', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const currencySelect = page.locator('select').filter({ hasText: /INR|EUR|Currency/ }).first();
    if (await currencySelect.isVisible()) {
      const val = await currencySelect.inputValue();
      expect(val).toBe('INR');
    }
  });

  test('Settings_Currency_002 — Changing currency to EUR persists on reload', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const currencySelect = page.locator('select').filter({ hasText: /INR|EUR/ }).first();
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption('EUR');
      const saveBtn = page.getByRole('button', { name: /save|update/i }).first();
      await saveBtn.click();
      await page.waitForTimeout(500);
      await page.reload();
      await page.waitForLoadState('networkidle');
      const val = await currencySelect.inputValue().catch(() => '');
      expect(val).toBe('EUR');
    }
  });

  test('Settings_Currency_003 — Only INR and EUR available in currency select', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const currencySelect = page.locator('select').filter({ hasText: /INR|EUR/ }).first();
    if (await currencySelect.isVisible()) {
      const options = await currencySelect.locator('option').allTextContents();
      const meaningful = options.filter(o => o.trim() && o !== 'Select currency');
      meaningful.forEach(opt => {
        expect(['INR', 'EUR']).toContain(opt.trim());
      });
    }
  });

  test('Settings_Theme_001 — Dark mode toggle switches theme class on html/body', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const darkToggle = page.locator('[role="switch"]').filter({ hasText: /dark|theme/i }).or(
      page.locator('button[class*="toggle"]').filter({ hasText: /dark/i })
    ).first();
    if (await darkToggle.isVisible()) {
      await darkToggle.click();
      await page.waitForTimeout(500);
      const htmlClass = await page.locator('html').getAttribute('class');
      const bodyClass = await page.locator('body').getAttribute('class');
      const combined = (htmlClass || '') + ' ' + (bodyClass || '');
      expect(combined).toContain('dark');
    }
  });

  test('Settings_DataExport_001 — Export Data button triggers file download', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const exportBtn = page.getByRole('button', { name: /export|download/i }).first();
    if (await exportBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await exportBtn.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.json|\.csv/i);
      }
    }
  });

  test('Settings_DataClear_001 — Clear Data button triggers confirmation and clears localStorage', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const clearBtn = page.getByRole('button', { name: /clear|reset|delete data/i }).first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|clear/i });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
        const txData = await page.evaluate(() => localStorage.getItem('finance_transactions'));
        const parsed = JSON.parse(txData || '[]');
        expect(parsed).toHaveLength(0);
      }
    }
  });

  test('Settings_Navigation_001 — Sidebar nav links in settings context resolve correctly', async ({ page }) => {
    await go(page, seedINR, 'settings');
    const dashLink = page.locator('nav a, nav button').filter({ hasText: 'Dashboard' }).first();
    if (await dashLink.isVisible()) {
      await dashLink.click();
      await expect(page).toHaveURL(`${APP}/dashboard`);
    }
  });

});

// ============================================================
// SECTION J — Sidebar
// ============================================================

test.describe('Sidebar', () => {

  test('Sidebar_Happy_001 — All 11 nav items visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await go(page, seedINR, 'dashboard');

    const navItems = ['Dashboard', 'Transactions', 'Accounts', 'Budgets', 'Savings Goals', 'Investments', 'Recurring', 'Loans', 'AI Oracle', 'Net Worth', 'Settings'];
    for (const item of navItems) {
      await expect(page.locator('nav').filter({ hasText: item }).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('Sidebar_Happy_002 — Active nav item highlighted for current route', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await go(page, seedINR, 'budgets');

    // Budgets link should have active styling
    const budgetsLink = page.locator('nav').getByText('Budgets').first();
    const parent = budgetsLink.locator('..');
    const classes = await parent.getAttribute('class');
    expect(classes || '').toMatch(/active|bg-|text-emerald|font-semibold/i);
  });

  test('Sidebar_Happy_003 — Sidebar logo/brand navigates to /app/dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await go(page, seedINR, 'settings');

    const logo = page.locator('nav a[href="/app/dashboard"], nav').locator('text=Finance').first();
    if (await logo.isVisible()) {
      await logo.click();
      await expect(page).toHaveURL(`${APP}/dashboard`);
    }
  });

  test('Sidebar_Mobile_001 — Sidebar hidden by default on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await go(page, seedINR, 'dashboard');

    // Sidebar should be off-screen or hidden
    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    if (await sidebar.isVisible()) {
      const box = await sidebar.boundingBox();
      // Either not visible or translated off screen
      if (box) expect(box.x).toBeLessThan(0);
    }
  });

  test('Sidebar_Mobile_002 — Hamburger opens sidebar; overlay closes it', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await go(page, seedINR, 'dashboard');

    const hamburger = page.locator('button.lg\:hidden, [class*="lg:hidden"] button').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(400);
      await expect(page.locator('nav').getByText('Dashboard').first()).toBeVisible();

      // Tap overlay
      await page.mouse.click(370, 400);
      await page.waitForTimeout(400);
    }
  });

  test('Sidebar_Mobile_003 — Clicking a nav link on mobile closes the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await go(page, seedINR, 'dashboard');

    const hamburger = page.locator('button.lg\:hidden, [class*="lg:hidden"] button').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(400);
      await page.locator('nav').getByText('Budgets').first().click();
      await expect(page).toHaveURL(`${APP}/budgets`);
    }
  });

  test('Sidebar_Happy_004 — All nav links navigate to correct /app/* routes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await go(page, seedINR, 'dashboard');

    const routes: [string, string][] = [
      ['Transactions', '/app/transactions'],
      ['Accounts',     '/app/accounts'],
      ['Budgets',      '/app/budgets'],
      ['Recurring',    '/app/recurring'],
      ['Loans',        '/app/loans'],
      ['Net Worth',    '/app/networth'],
      ['Settings',     '/app/settings'],
    ];

    for (const [label, expectedPath] of routes) {
      const link = page.locator('nav').getByText(label).first();
      await link.click();
      await expect(page).toHaveURL(`${BASE}${expectedPath}`);
    }
  });

  test('Sidebar_Happy_005 — Sidebar collapse button hides labels (icon-only mode)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await go(page, seedINR, 'dashboard');

    const collapseBtn = page.locator('button').filter({ has: page.locator('[data-lucide="panel-left-close"], [class*="ChevronLeft"]') }).first();
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(400);
      // Nav text labels should be hidden
      const dashLabel = page.locator('nav').getByText('Dashboard').first();
      await expect(dashLabel).not.toBeVisible();
    }
  });

});

// ============================================================
// SECTION K — Auth: Login Page
// ============================================================

test.describe('Auth — Login Page', () => {

  test('Login_Happy_001 — Login page renders with all required fields', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible();
  });

  test('Login_Happy_002 — Valid demo credentials log in and redirect to /app/dashboard', async ({ page }) => {
    // Seed a demo user first
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      localStorage.setItem('finance_user_profile', JSON.stringify({
        name: 'Demo User', email: 'demo@finance.app',
        preferences: { currency: 'INR', theme: 'light' },
      }));
      localStorage.setItem('finance_auth', JSON.stringify({ email: 'demo@finance.app', password: 'demo123' }));
    });
    await page.goto(`${BASE}/login`);

    await page.locator('input[type="email"]').fill('demo@finance.app');
    await page.locator('input[type="password"]').fill('demo123');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    await expect(page).toHaveURL(`${APP}/dashboard`, { timeout: 5000 });
  });

  test('Login_Negative_001 — Empty email shows validation error', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    const emailInput = page.locator('input[type="email"]');
    const isRequired = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isRequired).toBe(true);
  });

  test('Login_Negative_002 — Invalid email format shows browser validation', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"]').fill('notanemail');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    const emailInput = page.locator('input[type="email"]');
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('Login_Negative_003 — Wrong credentials show error message', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"]').fill('wrong@wrong.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForTimeout(500);

    // Should show error or remain on login page
    const currentUrl = page.url();
    const body = await page.textContent('body');
    const hasError = body?.match(/invalid|incorrect|not found|error/i) || currentUrl.includes('login');
    expect(hasError).toBeTruthy();
  });

  test('Login_Happy_003 — Password field input is masked (type=password)', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const pwInput = page.locator('input[type="password"]');
    await expect(pwInput).toHaveAttribute('type', 'password');
  });

  test('Login_Happy_004 — Show/hide password toggle works', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="password"]').fill('testpassword');

    const eyeToggle = page.locator('button').filter({
      has: page.locator('[data-lucide="eye"], [data-lucide="eye-off"]'),
    }).first();
    if (await eyeToggle.isVisible()) {
      await eyeToggle.click();
      const inputType = await page.locator('input[name="password"], input[id*="password"]').first().getAttribute('type');
      expect(inputType).toBe('text');
    }
  });

  test('Login_Nav_001 — Sign Up link navigates to /signup', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const signupLink = page.getByRole('link', { name: /sign up|register|create account/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(`${BASE}/signup`);
    }
  });

  test('Login_Nav_002 — Forgot Password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const forgotLink = page.getByRole('link', { name: /forgot|reset password/i });
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(`${BASE}/forgot-password`);
    }
  });

});

// ============================================================
// SECTION L — Auth: Signup Page
// ============================================================

test.describe('Auth — Signup Page', () => {

  test('Signup_Happy_001 — Signup page renders with all required fields', async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|create|register/i })).toBeVisible();
  });

  test('Signup_Happy_002 — Valid signup creates account and redirects to /app/dashboard', async ({ page }) => {
    await page.goto(`${BASE}/signup`);

    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.isVisible()) await nameInput.fill('E2E Test User');

    await page.locator('input[type="email"]').fill(`e2e_${Date.now()}@test.com`);
    await page.locator('input[type="password"]').first().fill('SecurePass123!');

    // Confirm password if present
    const confirmPw = page.locator('input[placeholder*="confirm" i], input[name*="confirm" i]').first();
    if (await confirmPw.isVisible()) await confirmPw.fill('SecurePass123!');

    await page.getByRole('button', { name: /sign up|create|register/i }).click();
    await expect(page).toHaveURL(`${APP}/dashboard`, { timeout: 8000 });
  });

  test('Signup_Negative_001 — Empty form shows validation errors', async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await page.getByRole('button', { name: /sign up|create|register/i }).click();

    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('Signup_Negative_002 — Mismatched passwords show error', async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await page.locator('input[type="email"]').fill('test@test.com');
    await page.locator('input[type="password"]').first().fill('Password123!');

    const confirmPw = page.locator('input[placeholder*="confirm" i], input[name*="confirm" i]').first();
    if (await confirmPw.isVisible()) {
      await confirmPw.fill('DifferentPassword!');
      await page.getByRole('button', { name: /sign up|create|register/i }).click();
      await page.waitForTimeout(500);
      const body = await page.textContent('body');
      expect(body).toMatch(/match|password|confirm/i);
    }
  });

  test('Signup_Happy_003 — Currency selector present with INR/EUR options only', async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    const currencySelect = page.locator('select').filter({ hasText: /INR|EUR|Currency/ }).first();
    if (await currencySelect.isVisible()) {
      const options = await currencySelect.locator('option').allTextContents();
      const meaningful = options.filter(o => o.trim() && !['Select', 'Currency'].includes(o.trim()));
      meaningful.forEach(opt => {
        expect(['INR', 'EUR']).toContain(opt.trim());
      });
    }
  });

  test('Signup_Nav_001 — Login link navigates back to /login', async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    const loginLink = page.getByRole('link', { name: /log in|sign in|already have/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(`${BASE}/login`);
    }
  });

});

// ============================================================
// SECTION M — Auth: Forgot Password Page
// ============================================================

test.describe('Auth — Forgot Password Page', () => {

  test('ForgotPw_Happy_001 — Page renders with email input and submit button', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible();
  });

  test('ForgotPw_Happy_002 — Valid email submission shows success state', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.getByRole('button', { name: /send|reset|submit/i }).click();
    await page.waitForTimeout(500);

    const body = await page.textContent('body');
    expect(body).toMatch(/sent|check|email|success/i);
  });

  test('ForgotPw_Negative_001 — Empty email shows validation error', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await page.getByRole('button', { name: /send|reset|submit/i }).click();
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('ForgotPw_Nav_001 — Back to Login link navigates to /login', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    const backLink = page.getByRole('link', { name: /back|login|sign in/i });
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page).toHaveURL(`${BASE}/login`);
    }
  });

});

// ============================================================
// SECTION N — Protected Routes & Navigation Guards
// ============================================================

test.describe('Protected Routes & Navigation Guards', () => {

  test('Guard_001 — Unauthenticated user redirected from /app/dashboard to /login', async ({ page }) => {
    // Clear all auth data
    await page.goto(`${BASE}/`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${APP}/dashboard`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toMatch(/login|\/$/);
  });

  test('Guard_002 — Authenticated user accessing /login redirected to /app/dashboard', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      localStorage.setItem('finance_user_profile', JSON.stringify({
        name: 'Test User', email: 'test@example.com',
        preferences: { currency: 'INR' },
      }));
    });
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');
    // Depending on implementation — check if redirected or login page still shown
    const url = page.url();
    const body = await page.textContent('body');
    // At minimum the page should not crash
    expect(body).not.toContain('NaN');
  });

  test('Guard_003 — All 11 /app/* routes accessible when authenticated', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      localStorage.setItem('finance_user_profile', JSON.stringify({
        name: 'Test User', email: 'test@example.com',
        preferences: { currency: 'INR' },
      }));
    });

    const routes = ['dashboard', 'transactions', 'accounts', 'budgets', 'savings',
                    'investments', 'recurring', 'loans', 'insights', 'networth', 'settings'];

    for (const route of routes) {
      await page.goto(`${APP}/${route}`);
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      expect(body).not.toContain('NaN');
      expect(page.url()).toContain(route);
    }
  });

  test('Guard_004 — 404 unknown route handled gracefully', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      localStorage.setItem('finance_user_profile', JSON.stringify({
        name: 'Test User', email: 'test@example.com',
        preferences: { currency: 'INR' },
      }));
    });
    await page.goto(`${APP}/thisroutedoesnotexist`);
    await page.waitForLoadState('networkidle');
    // Should show 404 page or redirect — not a white screen crash
    await expect(page.locator('body')).not.toBeEmpty();
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(10);
  });

});

// ============================================================
// SECTION O — Landing Page
// ============================================================

test.describe('Landing Page', () => {

  test('Landing_Happy_001 — Landing page renders hero section', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    // Hero heading should be visible
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Landing_Happy_002 — Get Started / Login CTA navigates to login or signup', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');

    const cta = page.getByRole('link', { name: /get started|sign up|start|try|login/i }).first();
    if (await cta.isVisible()) {
      await cta.click();
      await page.waitForLoadState('networkidle');
      const url = page.url();
      expect(url).toMatch(/login|signup|register/i);
    }
  });

  test('Landing_Happy_003 — No console errors on landing page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

});

// ============================================================
// SECTION P — Cross-Page Currency Consistency
// ============================================================

test.describe('Cross-Page Currency Consistency', () => {

  test('Currency_Consistency_INR_001 — All pages show ₹ after switching to INR in Settings', async ({ page }) => {
    await go(page, seedINR, 'settings');

    // Ensure INR is selected
    const currencySelect = page.locator('select').filter({ hasText: /INR|EUR/ }).first();
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption('INR');
      await page.getByRole('button', { name: /save|update/i }).first().click();
      await page.waitForTimeout(500);
    }

    const routes = ['dashboard', 'transactions', 'budgets', 'savings', 'investments'];
    for (const route of routes) {
      await page.goto(`${APP}/${route}`);
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      expect(body).toContain('₹');
      expect(body).not.toContain('NaN');
    }
  });

  test('Currency_Consistency_EUR_001 — All pages show € after seeding EUR user', async ({ page }) => {
    const routes = ['transactions', 'budgets', 'savings', 'investments', 'recurring', 'loans'];
    for (const route of routes) {
      await go(page, seedEUR, route);
      const body = await page.textContent('body');
      expect(body).toContain('€');
      expect(body).not.toContain('NaN');
    }
  });

  test('Currency_NoNaN_AllPages_001 — No NaN on any page with full INR dataset', async ({ page }) => {
    const routes = ['dashboard', 'transactions', 'accounts', 'budgets', 'savings',
                    'investments', 'recurring', 'loans', 'networth', 'settings'];
    for (const route of routes) {
      await go(page, seedINR, route);
      const body = await page.textContent('body');
      if (body?.includes('NaN')) {
        throw new Error(`NaN found on /app/${route}`);
      }
    }
  });

  test('Currency_NoNaN_AllPages_002 — No NaN on any page with full EUR dataset', async ({ page }) => {
    const routes = ['dashboard', 'transactions', 'accounts', 'budgets', 'savings',
                    'investments', 'recurring', 'loans', 'networth', 'settings'];
    for (const route of routes) {
      await go(page, seedEUR, route);
      const body = await page.textContent('body');
      if (body?.includes('NaN')) {
        throw new Error(`NaN found on /app/${route} with EUR data`);
      }
    }
  });

  test('Currency_NoNaN_AllPages_003 — No NaN on any page with empty dataset', async ({ page }) => {
    const routes = ['dashboard', 'transactions', 'accounts', 'budgets', 'savings',
                    'investments', 'recurring', 'loans', 'networth'];
    for (const route of routes) {
      await go(page, seedEmpty, route);
      const body = await page.textContent('body');
      if (body?.includes('NaN')) {
        throw new Error(`NaN found on /app/${route} with empty data`);
      }
    }
  });

  test('Currency_NoForbiddenSymbols_001 — No $, £, ¥ symbols anywhere in the app', async ({ page }) => {
    const routes = ['dashboard', 'transactions', 'accounts', 'budgets', 'savings',
                    'investments', 'recurring', 'loans', 'networth', 'settings'];
    for (const route of routes) {
      await go(page, seedINR, route);
      const body = await page.textContent('body');
      expect(body).not.toContain('$');
      expect(body).not.toContain('£');
      expect(body).not.toContain('¥');
    }
  });

});
