const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

const fixedBlock = `    // Hover first card to reveal trash button
    await cards.first().hover();
    // The trash button is the FIRST svg-bearing button in the card header, unlike previously assumed last()
    const trashBtn = cards.first().locator('button').filter({ has: page.locator('svg') }).first();
    await trashBtn.click();

    // Replacing brittle fixed timeout with robust asynchronous state propagation handler
    await expect(cards).toHaveCount(initial - 1, { timeout: 10000 });`;

content = content.replace(
  /\/\/ Hover first card to reveal trash button[\s\S]+?expect\(after\)\.toBe\(initial - 1\);/m,
  fixedBlock
);

fs.writeFileSync(path, content);
console.log("REPAIRED TARGET SELECTION IN HAPPY_012!!!");
