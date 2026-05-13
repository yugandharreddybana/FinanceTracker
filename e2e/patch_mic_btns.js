const fs = require('fs');
const path = 'f:/Projects/FinanceTracker/e2e/batch2.spec.ts';
let content = fs.readFileSync(path, 'utf8');

// Define the precise safe locator replacement
const newLocator = "const micBtn = page.locator('button').filter({ has: page.locator('svg.lucide-mic, [class*=\"lucide-mic\"]') }).first();";

// Replace the brittle variant with empty text filter
content = content.replace(/const micBtn = page\.locator\('button'\)\.filter\(\{ hasText: '' \}\)\.filter\(\{ has: page\.locator\('\[class\*="rounded-full"\]'\) \}\)\.first\(\);/g, newLocator);

// Replace the generic SVG filter variant
content = content.replace(/const micBtn = page\.locator\('button'\)\.filter\(\{ has: page\.locator\('svg'\) \}\)\.first\(\);/g, newLocator);

fs.writeFileSync(path, content);
console.log("SUCCESSFULLY PATCHED ALL MIC BUTTON LOCATORS!!!");
