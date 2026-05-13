const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Repair Happy_012
content = content.replace(
  /const cards = page\.locator\('\[class\*="rounded-2xl border p-4"\]'\);\s*\n\s*const initial = await cards\.count\(\);/m,
  `const cards = page.locator('[class*="rounded-2xl border p-4"]');\n    // Wait for initial render to be stable\n    await expect(cards.first()).toBeVisible({ timeout: 10000 });\n    const initial = await cards.count();`
);

// Repair Happy_013
content = content.replace(
  /await goToReview\(page, 'Spent ₹500 at Swiggy'\);\s*\r?\n\s*\r?\n\s*const initial = await page\.locator\('\[class\*="rounded-2xl border p-4"\]'\)\.count\(\);/m,
  `await goToReview(page, 'Spent ₹500 at Swiggy');\n\n    const cardLocator = page.locator('[class*="rounded-2xl border p-4"]');\n    // Wait for rendering stability\n    await expect(cardLocator.first()).toBeVisible({ timeout: 10000 });\n    const initial = await cardLocator.count();`
);

// In Happy_013, replace subsequent manual counts too to match new locator
content = content.replace(
  /const after = await page\.locator\('\[class\*="rounded-2xl border p-4"\]'\)\.count\(\);/m,
  `const after = await cardLocator.count();`
);

fs.writeFileSync(path, content);
console.log("STABILIZED CARD RENDERING SEQUENCES IN BATCH 39!!!");
