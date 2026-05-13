const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Perform the global fix for the broken savings goals mock URL mapping
content = content.replace(
  /'\*\*\/api\/finance\/savings'/g,
  "'**/api/finance/savings-goals'"
);

fs.writeFileSync(path, content);
console.log("SUCCESSFULLY CORRECTED API ENDPOINT TO /api/finance/savings-goals!!!");
