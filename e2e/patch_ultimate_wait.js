const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

const testContent = `
    await navigateAndSeed(page, seedINRData, 'dashboard');
    
    // Statically mock the corrected URL to be absolutely infallible
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

    // Open the modal directly. Context will trigger lazy loading fetch to our mock.
    await goToReview(page, 'Add ₹5000 to my emergency fund');

    await expect(page.getByText('Add to Goal').first()).toBeVisible({ timeout: 5000 });
    
    // Target the goal selector
    const goalSelect = page.locator('select').nth(1);
    
    // CRITICAL FIX: Use auto-waiting toContainText to allow API round-trip latency to resolve naturally!
    await expect(goalSelect).toContainText('Emergency Fund', { timeout: 10000 });
`;

content = content.replace(
  /test\('SmartAdd_Review_Happy_011[^\n]*\n\s*await navigateAndSeed[^;]+;\s*\r?\n\s*\/\/ OVERRIDE THE[\s\S]+?expect\(hasGoal\)\.toBe\(true\);\s*\n\s*\}/m,
  `test('SmartAdd_Review_Happy_011 — Add to Goal shows goal dropdown from context', async ({ page }) => {${testContent}}`
);

fs.writeFileSync(path, content);
console.log("APPLIED THE ULTIMATE AUTO-WAITING EXPECTATION FIX TO HAPPY_011!!!");
