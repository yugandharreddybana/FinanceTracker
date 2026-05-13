const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace the overly restrictive text locator with broad implicit/explicit text fallback
content = content.replace(
  /const descInput = page\.locator\('input\[type="text"\]'\)\.first\(\);/g, 
  "const descInput = page.locator('input:not([type]), input[type=\"text\"]').first();"
);

fs.writeFileSync(path, content);
console.log("SUCCESSFULLY REPAIRED ALL TEXT INPUT LOCATORS!!!");
