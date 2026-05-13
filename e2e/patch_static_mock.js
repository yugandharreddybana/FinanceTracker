const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

const testContent = `
    await navigateAndSeed(page, seedINRData, 'dashboard');
    
    // OVERRIDE THE SAVINGS MOCK STATICALLY IN-TEST TO PREVENT FLAKY LOCALSTORAGE LOOKUP RACES
    await page.route('**/api/finance/savings-goals', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: [
          { id: 'goal-1', name: 'Emergency Fund', target: 100000, current: 25000, deadline: '2026-12-31', emoji: '🛡️' },
          { id: 'goal-2', name: 'New Car', target: 500000, current: 50000, deadline: '2027-06-30', emoji: '🚗' }
        ]
      });
    });

    // Force client-side context refresh naturally
    await page.locator('nav, [class*="navigation"]').getByRole('link', { name: 'Goals' }).first().click();
    await expect(page).toHaveURL(/.*\\/app\\/savings.*/, { timeout: 10000 });
    
    await page.locator('nav, [class*="navigation"]').getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL(/.*\\/app\\/dashboard.*/, { timeout: 10000 });

    await goToReview(page, 'Add ₹5000 to my emergency fund');

    await expect(page.getByText('Add to Goal').first()).toBeVisible({ timeout: 5000 });
    
    const goalSelect = page.locator('select').nth(1);
    const options = await goalSelect.locator('option').allTextContents();
    const hasGoal = options.some(o => o.includes('Emergency Fund') || o.includes('New Car'));
    expect(hasGoal).toBe(true);
`;

content = content.replace(
  /test\('SmartAdd_Review_Happy_011[^\n]*\n\s*await navigateAndSeed[^;]+;\s*\r?\n\s*await seedSavingsGoals[^;]+;\s*\r?\n\s*\/\/ Force client-side[\s\S]+?expect\(hasGoal\)\.toBe\(true\);\s*\n\s*\}/m,
  `test('SmartAdd_Review_Happy_011 — Add to Goal shows goal dropdown from context', async ({ page }) => {${testContent}}`
);

fs.writeFileSync(path, content);
console.log("STATIC HARDCODED API MOCK APPLIED TO HAPPY_011!!!");
