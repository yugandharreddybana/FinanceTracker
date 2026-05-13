const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /await page\.getByText\('Receipt'\)\.click\(\);/g,
  "await page.getByRole('button', { name: 'Receipt' }).first().click();"
);

fs.writeFileSync(path, content);
console.log("SUCCESSFULLY PATCHED RECEIPT SWITCHER!");
