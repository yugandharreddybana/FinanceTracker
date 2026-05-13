const fs = require('fs');
const file = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /await expect\(page\.getByText\('All Done!'\)\)\.toBeVisible\(\{ timeout: 5000 \}\);\s*\r?\n\s*await page\.goto\(\`\$\{APP\}\/transactions\`\);/g,
  "await expect(page.getByText('All Done!')).toBeVisible({ timeout: 5000 });\n\n    await page.locator('nav, [class*=\"navigation\"]').getByRole('link', { name: 'Transactions' }).first().click();"
);

fs.writeFileSync(file, content);
console.log('Replaced successfully');
