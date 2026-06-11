import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers/demo-session';

test.describe('Demo account', () => {
  test('demo login shows enterprise shell and demo banners', async ({ page }) => {
    await loginAsDemo(page);

    await expect(page.getByTestId('demo-mode-banner')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('demo-mode-banner')).toContainText(/shared demo workspace/i);

    await page.goto('/app/transactions');
    await expect(page.getByTestId('page-transactions')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('demo-transactions-hint')).toBeVisible();
  });

  test('demo user can open investments without plan gate', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/app/investments');
    await expect(page.getByTestId('plan-gate')).toHaveCount(0);
    await expect(page.getByTestId('page-investments').or(page.locator('h1'))).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Tier admin accounts', () => {
  test('free admin sees plan gate on investments', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('free@yugifinance.com');
    await page.getByPlaceholder('••••••••').fill('Test@1234');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/app\//, { timeout: 120_000 });

    await page.goto('/app/investments');
    await expect(page.getByTestId('plan-gate').or(page.getByTestId('upgrade-modal'))).toBeVisible({ timeout: 15_000 });
  });
});
