import { test, expect } from '@playwright/test';

test.describe('SaaS subscription gating', () => {
  test('landing page shows EUR/INR pricing toggle', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Simple, transparent pricing')).toBeVisible();
    await expect(page.getByRole('button', { name: 'EUR' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'INR' })).toBeVisible();
    await page.getByRole('button', { name: 'INR' }).click();
    await expect(page.getByText('₹4,499').or(page.getByText('₹4499'))).toBeVisible({ timeout: 5000 });
  });

  test('free tier admin sees plan gate on investments route', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('free@yugifinance.com');
    await page.getByPlaceholder('••••••••').fill('Test@1234');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/app\//, { timeout: 120_000 });
    await page.goto('/app/investments');
    await expect(page.getByTestId('plan-gate').or(page.getByTestId('upgrade-modal'))).toBeVisible({ timeout: 15_000 });
  });
});
