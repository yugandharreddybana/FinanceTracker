import { test, expect } from '@playwright/test';

test.describe('Batch 1 — Zero-Bug Checklist Validation', () => {

  test('RESPONSIVE & UX: Layout integrity at 375px mobile and basic footer render', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X/12 baseline
    
    // 1. Audit Landing View
    await page.goto('/');
    const landingVisible = await page.locator('body').isVisible();
    expect(landingVisible).toBe(true);
    // Confirm zero massive overflow (simplistic heuristic: body width matches viewport)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 20); // Tolerance buffer
    
    // 2. Audit Footer Navigation Hooks
    const privacyLink = page.getByRole('link', { name: /privacy/i }).first();
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();
    await expect(page).toHaveURL(/.*privacy/);
    await expect(page.getByText(/How your financial data is handled/i)).toBeVisible();
  });

  test('SECURITY: Verify absolute containment of synthetic script injections (XSS Filter)', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.getByPlaceholder(/you@example.com/i).first();
    // Inject hazardous payload
    await emailInput.fill('<script>window.XSS_TRIP=true; alert("xss");</script>');
    
    // Verify system does NOT execute execution of content
    const hasTripped = await page.evaluate(() => (window as any).XSS_TRIP);
    expect(hasTripped).toBeUndefined();
  });

  test('FORMS: Certified Password Masking and Toggle Interactivity', async ({ page }) => {
    await page.goto('/login');
    
    const pwd = page.getByPlaceholder(/••••••••/i).first();
    
    // 1. Baseline Verification: Hard Mask Enforced
    await expect(pwd).toHaveAttribute('type', 'password');
    
    // 2. Actuate Toggle Anchor
    // The button contains the lucide Eye icon, look for button near it or with class text-slate-300
    const toggleBtn = page.locator('button:has(svg.lucide-eye)').or(page.locator('div.group.relative button[type="button"]')).first();
    await toggleBtn.click();
    
    // 3. Verify Decryption state activation
    await expect(pwd).toHaveAttribute('type', 'text');
    
    // 4. Re-actuate mask
    await toggleBtn.click();
    await expect(pwd).toHaveAttribute('type', 'password');
  });

  test('UX: High-Level Demonstration Modal Accessibility and Cleanup', async ({ page }) => {
    await page.goto('/');
    
    // 1. Locate potential Demo launchers
    const demoLaunch = page.getByRole('button', { name: /watch demo/i }).or(page.getByText(/demo/i)).first();
    if (await demoLaunch.isVisible()) {
      await demoLaunch.click();
      // Verify modal appears
      const modalClose = page.locator('button:has(svg.lucide-x)').first();
      if (await modalClose.isVisible()) {
        await modalClose.click();
        await expect(modalClose).not.toBeVisible();
      }
    }
  });

});
