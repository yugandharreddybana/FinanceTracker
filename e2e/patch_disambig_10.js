const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Locate the Happy_010 and update .first() to .nth(1) to avoid header selects
content = content.replace(
  /const typeSelect = page\.locator\('select'\)\.first\(\);\s*\r?\n\s*await typeSelect\.selectOption\('mutual_fund'\);/m,
  `const typeSelect = page.locator('select').nth(1);\n    await typeSelect.selectOption('mutual_fund');`
);

fs.writeFileSync(path, content);
console.log("RESOLVED SELECTOR COLLISION IN HAPPY_010!!!");
