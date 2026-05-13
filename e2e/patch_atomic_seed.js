const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Locate the whole test body of Happy_011
const testBlockRegex = /test\('SmartAdd_Review_Happy_011[^\}]+\{([\s\S]*?)\s*\}\);/m;
const testContent = `
    // Seed BOTH transactions and savings goals simultaneously BEFORE navigation hydration
    await navigateAndSeed(page, async (p) => {
      // Manually run seedINRData interior (or call helper)
      // For simplicity, we will call both helpers in order
      const id = () => crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];
      await p.evaluate((today) => {
        const generateId = () => Math.random().toString(36).substring(7);
        // Set transactions & user profile
        localStorage.setItem('finance_transactions', JSON.stringify([{ id: generateId(), merchant: 'Swiggy', amount: 500, type: 'expense', category: 'Food', date: today, status: 'confirmed', currency: 'INR' }]));
        localStorage.setItem('finance_budgets', '[]');
        localStorage.setItem('finance_accounts', '[]');
        localStorage.setItem('finance_user_profile', JSON.stringify({ name: 'Test User', email: 'test@example.com', preferences: { currency: 'INR', theme: 'light' } }));
        // Set goals
        localStorage.setItem('finance_savings_goals', JSON.stringify([
          { id: generateId(), name: 'Emergency Fund', target: 100000, current: 25000, deadline: '2026-12-31', emoji: '🛡️' },
          { id: generateId(), name: 'New Car', target: 500000, current: 50000, deadline: '2027-06-30', emoji: '🚗' }
        ]));
      }, today);
    }, 'dashboard');
    
    await goToReview(page, 'Add ₹5000 to my emergency fund');

    await expect(page.getByText('Add to Goal').first()).toBeVisible({ timeout: 5000 });
    // Goal dropdown should list existing goals
    const goalSelect = page.locator('select').nth(1);
    const options = await goalSelect.locator('option').allTextContents();
    const hasGoal = options.some(o => o.includes('Emergency Fund') || o.includes('New Car'));
    expect(hasGoal).toBe(true);
`;

// Safely perform full functional replacement of Happy_011 to maximize atomicity
content = content.replace(
  /test\('SmartAdd_Review_Happy_011[^\n]*\n\s*await navigateAndSeed[^;]+;\s*\r?\n\s*await seedSavingsGoals[^;]+;\s*\r?\n\s*await page\.reload\(\);[^;]+\n\s*await goToReview\([\s\S]+?expect\(hasGoal\)\.toBe\(true\);\s*\n\s*\}/m,
  `test('SmartAdd_Review_Happy_011 — Add to Goal shows goal dropdown from context', async ({ page }) => {${testContent}}`
);

fs.writeFileSync(path, content);
console.log("ATOMIC SEED INJECTION APPLIED TO HAPPY_011!!!");
