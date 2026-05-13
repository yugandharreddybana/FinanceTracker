const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

const testContent = `
    await navigateAndSeed(page, seedINRData, 'dashboard');
    await goToReview(page, 'Add ₹5000 to my emergency fund');

    await expect(page.getByText('Add to Goal').first()).toBeVisible({ timeout: 5000 });
    
    // Target the goal selector
    const goalSelect = page.locator('select').nth(1);
    
    // Auto-waiting toContainText allows cached API content to flow naturally!
    await expect(goalSelect).toContainText('Emergency Fund', { timeout: 10000 });
`;

// Reverting Happy_011 to ultimate simplicity leveraging the reinforced infrastructure
content = content.replace(
  /test\('SmartAdd_Review_Happy_011[^\n]*\n\s*await navigateAndSeed[^;]+;\s*\r?\n\s*\/\/ Statically mock[\s\S]+?expect\(goalSelect\)\.toContainText\('Emergency Fund', \{ timeout: 10000 \}\);\s*\n\s*\}/m,
  `test('SmartAdd_Review_Happy_011 — Add to Goal shows goal dropdown from context', async ({ page }) => {${testContent}}`
);

fs.writeFileSync(path, content);
console.log("CLEANED UP HAPPY_011 TEST CODE!!!");
