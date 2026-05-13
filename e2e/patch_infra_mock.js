const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Locate the specialized mock override inside beforeEach and make it concrete static
const targetBlock = /await page\.route\('\*\*\/api\/finance\/savings-goals', async route => \{[\s\S]*?await route\.fulfill\(\{ status: 200, json: data \}\);\s*\n\s*\}\);/m;

const fixedMock = `await page.route('**/api/finance/savings-goals', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: [
        { id: 'g1', name: 'Emergency Fund', target: 100000, current: 25000, deadline: '2026-12-31', emoji: '🛡️', currency: 'INR' },
        { id: 'g2', name: 'New Car',        target: 500000, current: 50000, deadline: '2027-06-30', emoji: '🚗', currency: 'INR' }
      ]
    });
  });`;

content = content.replace(targetBlock, fixedMock);

fs.writeFileSync(path, content);
console.log("PERMANENT STATIC SAVINGS GOAL ARCHITECTURE UPGRADED!!!");
