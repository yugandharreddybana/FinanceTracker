const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Upgrade goalSelect to target the proper contextual dropdown rather than the top-level header dropdown
content = content.replace(
  /const goalSelect = page\.locator\('select'\)\.first\(\);(\s*\r?\n\s*const options = await goalSelect\.locator\('option'\)\.allTextContents\(\);)/m,
  "const goalSelect = page.locator('select').nth(1);$1"
);

fs.writeFileSync(path, content);
console.log("SUCCESSFULLY REDIRECTED GOAL SELECTOR TO NTH(1)!!!");
