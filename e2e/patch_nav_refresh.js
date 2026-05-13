const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

const testContent = `
    await navigateAndSeed(page, seedINRData, 'dashboard');
    await seedSavingsGoals(page);
    
    // Force client-side context refresh by using app navigation to trigger refetches naturally
    await page.locator('nav, [class*="navigation"]').getByRole('link', { name: 'Goals' }).first().click();
    await expect(page).toHaveURL(/.*\\/app\\/savings.*/, { timeout: 10000 });
    
    await page.locator('nav, [class*="navigation"]').getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL(/.*\\/app\\/dashboard.*/, { timeout: 10000 });

    await goToReview(page, 'Add ₹5000 to my emergency fund');

    await expect(page.getByText('Add to Goal').first()).toBeVisible({ timeout: 5000 });
    
    // Target the secondary dropdown which holds specific goals
    const goalSelect = page.locator('select').nth(1);
    const options = await goalSelect.locator('option').allTextContents();
    const hasGoal = options.some(o => o.includes('Emergency Fund') || o.includes('New Car'));
    expect(hasGoal).toBe(true);
`;

content = content.replace(
  /test\('SmartAdd_Review_Happy_011[^\n]*\n\s*\/\/ Seed BOTH[\s\S]+?expect\(hasGoal\)\.toBe\(true\);\s*\n\s*\}/m,
  `test('SmartAdd_Review_Happy_011 — Add to Goal shows goal dropdown from context', async ({ page }) => {${testContent}}`
);

fs.writeFileSync(path, content);
console.log("NATIVE NAVIGATION TRIGGER APPLIED TO HAPPY_011!!!");
