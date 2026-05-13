import { expect, type Page } from '@playwright/test';

/**
 * Signs in with the seeded demo account. Requires the Express middleware (and Spring Boot
 * where applicable) so POST /api/auth/login succeeds for demo@yugifinance.com.
 */
export async function loginAsDemo(page: Page) {
  await page.context().clearCookies();
  await page.goto('/login');
  await expect(page.getByTestId('page-login')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('login-demo-button').click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 120_000 });
  await expect(page.getByTestId('top-bar')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('page-dashboard')).toBeVisible({ timeout: 120_000 });
}

export async function expectAuthenticatedShell(page: Page) {
  await expect(page.getByTestId('top-bar')).toBeVisible({ timeout: 120_000 });
}
