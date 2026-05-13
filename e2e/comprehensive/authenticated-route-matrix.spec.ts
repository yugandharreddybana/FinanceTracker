import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/demo-session';
import { AUTHENTICATED_APP_ROUTE_ROOTS } from '../helpers/app-routes';

test.describe('Authenticated route matrix', () => {
  test('Every registered /app route exposes its root test id in the main shell', async ({ page }) => {
    await loginAsDemo(page);

    for (const route of AUTHENTICATED_APP_ROUTE_ROOTS) {
      await test.step(`${route.path} → ${route.testId}`, async () => {
        await page.goto(route.path);
        await expect(page.getByTestId('top-bar')).toBeVisible();
        await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 60_000 });
      });
    }
  });

  test('Unknown /app segment renders not-found shell with recovery to dashboard', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/app/definitely-not-a-defined-page-999');
    await expect(page.getByTestId('page-not-found')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Page Not Found/i })).toBeVisible();
    await page.getByRole('button', { name: /Go to Dashboard/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByTestId('page-dashboard')).toBeVisible();
  });
});
