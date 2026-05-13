const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /await seedSavingsGoals\(page\);/g,
  "await seedSavingsGoals(page);\n    await page.reload(); // Ensure state hydration includes goals"
);

fs.writeFileSync(path, content);
console.log("SUCCESSFULLY FORCED PAGE RELOAD AFTER SAVINGS GOAL SEED!!!");
