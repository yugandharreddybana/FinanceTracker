import { test, expect } from '@playwright/test';

// Helpers to simulate system times deterministically via Init Script injection
const setSystemHour = async (page: any, hour: number) => {
  await page.addInitScript(`{
    const RealDate = Date;
    const customTime = new Date();
    customTime.setHours(${hour}, 0, 0, 0);
    const offset = customTime.getTime() - RealDate.now();
    
    // Overwrite Date constructor to inject artificial drift
    class FakeDate extends Date {
      constructor(...args) {
        if (args.length === 0) {
          super(RealDate.now() + offset);
        } else {
          super(...args);
        }
      }
      static now() {
        return RealDate.now() + offset;
      }
    }
    window.Date = FakeDate;
  }`);
};

test.describe('Dashboard Performance Indicator Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Common Pre-condition: Must target the mandated starting URL
    await page.goto('/app/dashboard');
    // Auth shield will redirect unauthenticated sessions back to login
    await page.getByRole('button', { name: /Try Demo Account/i }).first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10000 });
  });

  test('Dashboard_KPI_Happy_001: Stat cards render precise labels and derived values', async ({ page }) => {
    // SEEDING PHASE: Inject valid hierarchical schema entities
    await page.evaluate(async () => {
      const baseUrl = 'http://localhost:4000';
      const fetchOpts: RequestInit = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      };

      // Step 1: Establish Parent Account Vector preventing orphaned transactional rejection
      const uniqueSuffix = Date.now().toString();
      const accountName = `Audit Reserve Alpha ${uniqueSuffix}`;
      const accountRes = await fetch(`${baseUrl}/api/finance/accounts`, {
        ...fetchOpts,
        body: JSON.stringify({
          name: accountName,
          type: 'Savings',
          bank: 'Federal System',
          balance: 100000.00,
          currency: 'INR',
          color: '#10B981',
          isPrimary: true
        })
      });
      if (!accountRes.ok) throw new Error(`Account setup failed: ${accountRes.status}`);
      const accountData = await accountRes.json();
      const accountRef = accountData.id || accountName; // Failover to name if ID missing, but we prefer precise matching

      // Step 2: Supply contextual ledger records physically mapping to the new target via ID
      const entries = [
        { merchant: 'Payload Distribution Corp', amount: 75000, type: 'income', category: 'Salary', date: '2026-05-10', transactionDate: '2026-05-10', account: accountRef, currency: 'INR', status: 'confirmed' },
        { merchant: 'Core Server Rent', amount: 12000, type: 'expense', category: 'Housing', date: '2026-05-10', transactionDate: '2026-05-10', account: accountRef, currency: 'INR', status: 'confirmed' },
        { merchant: 'Node Energy Grid', amount: 3500, type: 'expense', category: 'Utilities', date: '2026-05-10', transactionDate: '2026-05-10', account: accountRef, currency: 'INR', status: 'confirmed' },
        { merchant: 'Cloud Provisioning', amount: 800, type: 'expense', category: 'Tech', date: '2026-05-10', transactionDate: '2026-05-10', account: accountRef, currency: 'INR', status: 'confirmed' },
        { merchant: 'Network Transit Unit', amount: 1200, type: 'expense', category: 'Tech', date: '2026-05-10', transactionDate: '2026-05-10', account: accountRef, currency: 'INR', status: 'confirmed' }
      ];
      
      for (const entry of entries) {
        const res = await fetch(`${baseUrl}/api/finance/transactions`, {
          ...fetchOpts,
          body: JSON.stringify(entry)
        });
        if (!res.ok) {
          const errTxt = await res.text();
          throw new Error(`Tx Dispatch Blocked [${res.status}]: ${errTxt}`);
        }
      }
    });

    // Reload visual hydration to catch new persisted seed values
    await page.reload();
    await page.waitForTimeout(1500);

    // 1. Assert Presence and Content of labeled primitives
    const balanceCard = page.getByText(/Total Balance/i).first().locator('..');
    await expect(balanceCard).toBeVisible({ timeout: 5000 });
    const balText = await balanceCard.locator('p.font-black').innerText();
    expect(balText).not.toBe('₹0');
    expect(balText).not.toBe('₹0.00');

    const incomeCard = page.getByText(/^Income$/i).first().locator('..');
    await expect(incomeCard).toBeVisible();
    const incText = await incomeCard.locator('p.font-black').innerText();
    expect(incText).not.toBe('₹0');
    expect(incText).not.toBe('₹0.00');

    const expenseCard = page.getByText(/^Expenses$/i).first().locator('..');
    await expect(expenseCard).toBeVisible();
    const expText = await expenseCard.locator('p.font-black').innerText();
    expect(expText).not.toBe('₹0');
    expect(expText).not.toBe('₹0.00');

    const nwCard = page.getByText(/Net Worth/i).first().locator('..');
    await expect(nwCard).toBeVisible();
  });

  test('Dashboard_KPI_Happy_003: Privacy masking selectively restricts visibility vectors', async ({ page }) => {
    // 1. PRE-STATE: Verify hard numbers exist
    const balEl = page.getByText(/Total Balance/i).locator('..').locator('p.font-black');
    const nwEl = page.getByText(/Net Worth/i).locator('..').locator('p.font-black');
    
    const initialVal = await balEl.innerText();
    expect(initialVal).not.toBe('•••••••');
    const initialNw = await nwEl.innerText();
    expect(initialNw).not.toBe('•••••••');

    // 2. ACTUATE: Toggle hidden anchor
    const eyeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') }).first();
    await eyeBtn.click();

    // 3. POST-STATE ASSERTIONS: Restricted vectors must obscure content
    await expect(balEl).toHaveText('•••••••');
    await expect(nwEl).toHaveText('•••••••');

    // 4. SECULAR CONTAINMENT: Income and expense cards remain raw and legible
    const incEl = page.getByText(/^Income$/i).locator('..').locator('p.font-black');
    await expect(incEl).not.toHaveText('•••••••');
    const expEl = page.getByText(/^Expenses$/i).locator('..').locator('p.font-black');
    await expect(expEl).not.toHaveText('•••••••');

    // 5. RESTORE: Deactivate masking and verify hydration return
    await eyeBtn.click();
    const restoredVal = await balEl.innerText();
    expect(restoredVal).not.toBe('•••••••');
    expect(restoredVal).toContain('₹');
  });

  test('Dashboard_KPI_Currency_INR_001: Verify KPI cards show ₹ symbol when user has INR accounts only', async ({ page }) => {
    // 1. Ensure minimum dataset is visible
    await page.waitForTimeout(1000);

    // 2. Verify all 4 KPI cards start with ₹
    const cards = ['Total Balance', 'Income', 'Expenses', 'Net Worth'];
    for (const label of cards) {
      // Scope locator to 'main' content area to avoid hitting duplicate labels in Sidebar links
      const valEl = page.locator('main').getByText(new RegExp(label, 'i')).locator('..').locator('p.font-black').first();
      await expect(valEl).toContainText('₹', { timeout: 5000 });
    }

    // 3. Verify TopBar Quick Balance (Requires forcing desktop viewport width)
    await page.setViewportSize({ width: 1440, height: 900 });
    
    const upArrow = page.getByText('↑₹').first();
    const downArrow = page.getByText('↓₹').first();
    
    await expect(upArrow).toBeVisible({ timeout: 5000 });
    await expect(downArrow).toBeVisible({ timeout: 5000 });
    
    // Verify actual CSS color presence implicitly guarantees they are visual match
    await expect(upArrow).toHaveClass(/text-emerald-600/);
    await expect(downArrow).toHaveClass(/text-rose-500/);
  });

  test('Dashboard_KPI_Currency_Mixed_001: Verify Dashboard does not crash or show NaN when user has both INR and EUR accounts', async ({ page }) => {
    // 1. Attach listener for browser level crash triggers (console errors)
    const consoleErrs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrs.push(msg.text());
    });

    // 2. Seed synthetic dual-currency environment
    await page.evaluate(async () => {
      const baseUrl = 'http://localhost:4000';
      const opts: RequestInit = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      };

      const stamp = Date.now();
      
      // Seed A: Create baseline EUR Account to collide against existing INR stack
      const resA = await fetch(`${baseUrl}/api/finance/accounts`, {
        ...opts,
        body: JSON.stringify({
          name: `EU Reserve ${stamp}`, type: 'Savings', bank: 'Deutsche', balance: 2000.00, currency: 'EUR', color: '#3B82F6'
        })
      });
      if (!resA.ok) throw new Error('EUR Account Seed Failed');
      const datA = await resA.json();

      // Seed B: Generate multi-currency ledger activity
      const entries = [
        { merchant: 'Frankfurt Cafe', amount: 45.00, type: 'expense', category: 'Food & Drink', date: new Date().toISOString().slice(0,10), account: datA.id, currency: 'EUR', status: 'confirmed' },
        { merchant: 'EUR Payout', amount: 500.00, type: 'income', category: 'Salary', date: new Date().toISOString().slice(0,10), account: datA.id, currency: 'EUR', status: 'confirmed' }
      ];

      for (const ent of entries) {
        await fetch(`${baseUrl}/api/finance/transactions`, { ...opts, body: JSON.stringify(ent) });
      }
    });

    // 3. Hard Navigate to fully refresh global context pool
    await page.goto('http://localhost:5173/app/dashboard');
    await page.waitForTimeout(2000); // Allow finance async refresh cycles to flush completely

    // 4. Audit Visual Performance Vectors
    const labels = ['Total Balance', 'Income', 'Expenses', 'Net Worth'];
    for (const lbl of labels) {
      const val = await page.locator('main').getByText(new RegExp(lbl, 'i')).locator('..').locator('p.font-black').first().innerText();
      expect(val).not.toContain('NaN');
      expect(val).not.toContain('undefined');
      expect(val).not.toContain('null');
      // Confirm it physically renders a number indicating success calculation
      expect(val).toMatch(/\d/);
    }

    // 5. Physical context key validation via explicit state hook
    const hasMixedKeys = await page.evaluate(() => {
      const context = (window as any).__FinanceContext;
      if (!context) return false;
      const cKeys = Object.keys(context.spendingDataByCurrency || {});
      return cKeys.includes('INR') && cKeys.includes('EUR');
    });
    
    // We only assert inclusion IF the application computed them successfully 
    // Wait, let's just inspect the actual keys to yield better assertion failure output
    const keys = await page.evaluate(() => Object.keys((window as any).__FinanceContext?.spendingDataByCurrency || {}));
    expect(keys).toContain('INR');
    expect(keys).toContain('EUR');

    // 6. Verify stability baseline
    expect(consoleErrs.length).toBe(0);
  });

  test('Dashboard_KPI_Edge_002: Verify KPI cards render correctly with very large INR values', async ({ page }) => {
    // Common Pre-condition: Ensure state snapshot settled
    await page.waitForTimeout(2000);

    // 1. Collect baseline numeric text to derive post-seed deterministic targets
    const balanceLoc = page.locator('main').getByText(/Total Balance/i).locator('..').locator('p.font-black').first();
    const preText = await balanceLoc.innerText();
    
    // Convert existing view (e.g. "₹2,50,000") into raw integer using rigorous digit sanitation
    const preValue = parseInt(preText.replace(/[^\d.-]/g, '') || '0', 10);

    // 2. Deploy deterministic target value vector (99,999,999) via internal auth-inheriting hook
    const injectedAmount = 99999999;
    await page.evaluate(async (amt) => {
      const ctx = (window as any).__FinanceContext;
      if (!ctx) throw new Error('Audit Context Missing');

      const whaleUnique = `Whale Apex Reserve ${Date.now()}`;
      
      // Establishing structural base without network interception hazards
      await ctx.addAccount({
        name: whaleUnique, type: 'Savings', bank: 'Global Reserve', balance: amt, currency: 'INR', color: '#10B981', isPrimary: false
      });
    }, injectedAmount);

    // 3. Stabilize UI synchronization
    await page.waitForTimeout(2500);

    // 4. Execute Rigid Mathematical Locale Enforcement Audit
    const postText = await balanceLoc.innerText();
    
    // Mathematically derive precise outcome expected from runtime sum engines
    const targetOutcome = preValue + injectedAmount;
    
    // Leverage standardized Indian number system generator identical to standard expectations
    const formatValidator = new Intl.NumberFormat('en-IN').format(targetOutcome);
    
    // Physically verify application matches theoretical localized expected output
    expect(postText).toContain(formatValidator);

    // 5. Auditing localized visual consistency and bounding box rigidity
    await expect(balanceLoc).toBeVisible();
    const geometry = await balanceLoc.boundingBox();
    if (geometry) {
       // Ensures card handles large strings without excessive line wrapping or geometry decay
       expect(geometry.height).toBeLessThan(80); 
    }
  });

  test('Dashboard_KPI_Edge_003: Verify KPI cards render correctly with very large EUR values', async ({ page }) => {
    await page.waitForTimeout(2000);
    const injectionKey = `EUR Whale Reserve ${Date.now()}`;
    const massiveAmt = 9999999;

    // 1. Deploy internal authenticated account vector (Proven safe pathway)
    await page.evaluate(async (data) => {
      const ctx = (window as any).__FinanceContext;
      if (!ctx) throw new Error('Evaluation context absent');
      
      await ctx.addAccount({
        name: data.lbl, type: 'Savings', bank: 'European Central', balance: data.amt, currency: 'EUR', color: '#3B82F6', isPrimary: false
      });
    }, { lbl: injectionKey, amt: massiveAmt });

    // 2. Perform deterministic localized frame navigation leveraging Sidebar controllers
    // Physically interacting with persistent React navigation nodes maintains internal cache hydration shielding state resets.
    await page.getByRole('link', { name: /^accounts$/i }).first().click();
    
    // Await dynamic routing synchronization
    await page.waitForTimeout(2000);

    // 3. Locate visual representation layer of the generated high-value account
    const accountCard = page.locator('div').getByText(injectionKey).locator('..');
    await expect(accountCard).toBeVisible({ timeout: 10000 });

    // Extract amount view using specific cardinality class applied in BankAccountsPage fix
    const currencyDisplay = await accountCard.locator('p.text-3xl.font-black').innerText();

    // Verify symbol mapping accurately derived via newly refactored cascading formatter
    expect(currencyDisplay).toContain('€');
    
    // Assert standard global numerical notation was correctly derived (e.g. NOT Indian lakhs/crores)
    // We expect 9,999,999 (Western) rather than 99,99,999 (Indian)
    expect(currencyDisplay).toContain('9,999,999');
  });

});

// Separate describe block so each test gets a CLEAN fresh context without cached scripts to evaluate individual system hours
test.describe('Dashboard Temporal Greeting Dynamics', () => {

  test('Dashboard_KPI_Happy_002a: should greet with Morning signature before noon', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setSystemHour(page, 9); // 9:00 AM

    await page.goto('/app/dashboard');
    await page.getByRole('button', { name: /Try Demo Account/i }).first().click();
    
    await expect(page.getByRole('heading', { name: /Good morning/i })).toBeVisible({ timeout: 10000 });
    await context.close();
  });

  test('Dashboard_KPI_Happy_002b: should transition to Afternoon signature mid-day', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setSystemHour(page, 15); // 3:00 PM

    await page.goto('/app/dashboard');
    await page.getByRole('button', { name: /Try Demo Account/i }).first().click();
    
    await expect(page.getByRole('heading', { name: /Good afternoon/i })).toBeVisible({ timeout: 10000 });
    await context.close();
  });

  test('Dashboard_KPI_Happy_002c: should deploy Evening signature at twilight', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setSystemHour(page, 20); // 8:00 PM

    await page.goto('/app/dashboard');
    await page.getByRole('button', { name: /Try Demo Account/i }).first().click();
    
    await expect(page.getByRole('heading', { name: /Good evening/i })).toBeVisible({ timeout: 10000 });
    await context.close();
  });

});

// Verification Suite isolating Zero-State Edge Cases with pristine user cycles
test.describe('Dashboard Zero-State Robustness', () => {
  test('Dashboard_KPI_Edge_001: Verify KPI cards show zero correctly for a new user', async ({ page }) => {
    // 1. Launch hard isolated user synthesis via UI Signup loop
    await page.goto('http://localhost:5173/signup');
    const uniqueSig = `edge_tester_${Date.now()}@yugi.test`;

    await page.getByPlaceholder(/Yugandhar Reddy/i).fill('Isolated Quality Vector');
    await page.getByPlaceholder(/you@example\.com/i).fill(uniqueSig);
    await page.getByPlaceholder(/Min 8 characters/i).fill('ZeroCaseP@ssword');
    await page.getByPlaceholder(/Confirm your password/i).fill('ZeroCaseP@ssword');
    
    await page.getByRole('button', { name: /Create Account/i }).click();

    // 2. Verify structural pivot to protected platform root
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 20000 });

    // 3. Configure continuous audit for runtime crash telemetry
    const errStack: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errStack.push(msg.text());
    });

    // Enforce standard ingestion pause to allow zero-states to stabilize
    await page.waitForTimeout(3000);

    // 4. Verify deterministic zero-states rendering
    const metrics = ['Total Balance', 'Income', 'Expenses', 'Net Worth'];
    for (const met of metrics) {
      const display = await page.locator('main').getByText(new RegExp(met, 'i')).locator('..').locator('p.font-black').first().innerText();
      
      // Check for explicit Presence of 0 to ensure math completed
      expect(display).toContain('0');
      
      // Assert isolation from dynamic stringification artifacts
      expect(display).not.toContain('NaN');
      expect(display).not.toContain('undefined');
      expect(display).not.toContain('null');
    }

    // 5. Zero-Crash Assurance
    expect(errStack.length).toBe(0);
  });
});

test.describe('Dashboard Chart Visualizations', () => {

  test.beforeEach(async ({ page }) => {
    // Common Pre-condition: Launch context into certified demo framework
    await page.goto('/app/dashboard');
    await page.getByRole('button', { name: /Try Demo Account/i }).first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10000 });
  });

  test('Dashboard_Charts_Happy_001: Verify Cash Flow Area Chart renders with Income and Expenses lines', async ({ page }) => {
    // Await micro-delays for initial layout animations to cascade
    await page.waitForTimeout(2000);
    
    // 1. Static Identifier Verification
    await expect(page.getByRole('heading', { name: /^Cash Flow$/i })).toBeVisible();
    await expect(page.getByText(/Income vs expenses/i)).toBeVisible();

    // 2. Underlying Dynamic SVG Containment Verification
    const container = page.locator('.recharts-responsive-container').first();
    await expect(container).toBeVisible();
    
    const frame = container.locator('svg');
    await expect(frame).toBeVisible();

    // 3. Validating vector path renders targeting assigned metric strokes
    // Injected configuration enforces specific green (#10B981) and rose (#F43F5E) hex values
    const incomeTrace = frame.locator('path[stroke="#10B981"]').first();
    const expenseTrace = frame.locator('path[stroke="#F43F5E"]').first();
    
    await expect(incomeTrace).toBeAttached();
    await expect(expenseTrace).toBeAttached();
    
    // Verify structural visibility ensuring visibility and presence overlap
    await expect(incomeTrace).toBeVisible();

    // 4. Discrete Legend & Axis Validation
    // Upgrading extraction to explicit textContent evaluators to circumvent SVG serialization variance
    const markerLabels = await frame.locator('text.recharts-cartesian-axis-tick-value').evaluateAll(
      elements => elements.map(e => e.textContent).filter(Boolean)
    ) as string[];
    
    console.log('CHART AXIS CAPTURE:', JSON.stringify(markerLabels));
    
    // Assert temporal resolution (Checks for month strings like Jan, Oct, Nov, etc)
    const isTimeAware = markerLabels.some(val => val && /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(val));
    // Assert scaled representation (Checks for enforced 'k' or '₹' currency vectors)
    const isCurrencyFormatted = markerLabels.some(val => val && (val.includes('₹') || val.toLowerCase().includes('k')));
    
    expect(isTimeAware).toBeTruthy();
    expect(isCurrencyFormatted).toBeTruthy();
  });

  test('Dashboard_Charts_Happy_002a: Verify Cash Flow chart tooltip appears on hover [INR User]', async ({ page }) => {
    await page.waitForTimeout(2000);
    const container = page.locator('.recharts-responsive-container').first();
    await expect(container).toBeVisible();
    
    // 1. Trigger precise spatial hover forcing tooltip detonation
    // Positioned towards right quadrant to guarantee axis data intersection
    await container.hover({ position: { x: 250, y: 100 } });
    
    // 2. Inspect dynamically materialized tooltip node (scoped to current container to prevent collision with pie-chart tooltips)
    const tooltip = container.locator('.recharts-tooltip-wrapper');
    await expect(tooltip).toBeVisible({ timeout: 5000 });
    
    const text = await tooltip.innerText();
    
    // Assert content existence and standard formatted symbol adherence
    expect(text.length).toBeGreaterThan(5);
    expect(text).toContain('Income');
    expect(text).toContain('₹');
  });

});

test.describe('Dashboard Isolated Chart Validation', () => {

  test('Dashboard_Charts_Happy_002b: Verify tooltip uses EUR symbol for pure EUR user stack', async ({ page }) => {
    // 1. Establish Absolute Pervasive Read-State Intercepts ensuring immutable EUR footprints survive all reloads
    await page.route('**/api/finance/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: [{ 
          id: 'eur-bank-01', 
          name: 'Euro Master Reserve', 
          currency: 'EUR', 
          balance: 25000, 
          type: 'Savings',
          isPrimary: true,
          color: '#3B82F6'
        }]
      });
    });

    await page.route('**/api/finance/transactions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: [
          { 
            id: 'eur-tx-01', amount: 5000, currency: 'EUR', type: 'income', category: 'salary', merchant: 'EU Corp 1',
            date: new Date().toISOString().split('T')[0], status: 'confirmed'
          },
          { 
            id: 'eur-tx-02', amount: 4800, currency: 'EUR', type: 'income', category: 'salary', merchant: 'EU Corp 2',
            date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0], status: 'confirmed'
          },
          { 
            id: 'eur-tx-03', amount: 4600, currency: 'EUR', type: 'income', category: 'salary', merchant: 'EU Corp 3',
            date: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString().split('T')[0], status: 'confirmed'
          }
        ]
      });
    });

    // 2. Launch pristine user loop - API mocking guarantees immediate EUR environment dehydration
    await page.goto('http://localhost:5173/signup');
    const sig = `eur_chart_test_${Date.now()}@antigravity.qa`;
    
    await page.getByPlaceholder(/Yugandhar Reddy/i).fill('EUR Grid Validator');
    await page.getByPlaceholder(/you@example\.com/i).fill(sig);
    await page.getByPlaceholder(/Min 8 characters/i).fill('IsolatedP@ssword');
    await page.getByPlaceholder(/Confirm your password/i).fill('IsolatedP@ssword');
    
    await page.getByRole('button', { name: /Create Account/i }).click();

    // Wait for redirection into fully hydrated EUR state
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 20000 });
    
    // Allow analytics engines to fully calculate derived states
    await page.waitForTimeout(5000);

    const container = page.locator('.recharts-responsive-container').first();
    await expect(container).toBeVisible();
    
    // 3. Trigger spatial interaction leveraging identical vectors validated under standard baseline setups
    await container.hover({ position: { x: 250, y: 100 } });
    
    const tooltip = container.locator('.recharts-tooltip-wrapper');
    await expect(tooltip).toBeVisible({ timeout: 8000 });
    
    const tooltipContent = await tooltip.innerText();
    
    // 4. Final Compliance Audit: Confirm ultimate cascade of Euro symbol override through entire pipeline
    expect(tooltipContent).toContain('€');
    expect(tooltipContent).not.toContain('₹');
  });

});
