const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Stabilize Hardcode_001 with rendering wait
content = content.replace(
  /await goToReview\(page, 'Paid €50 at Lidl'\);\s*\r?\n\s*\r?\n\s*const amtLabel/m,
  `await goToReview(page, 'Paid €50 at Lidl');\n\n    // Ensure rendering is complete before state interrogation\n    await expect(page.locator('[class*="rounded-2xl border p-4"]').first()).toBeVisible({ timeout: 10000 });\n\n    const amtLabel`
);

fs.writeFileSync(path, content);
console.log("STABILIZED RENDERING IN HARDCODE_001!!!");
