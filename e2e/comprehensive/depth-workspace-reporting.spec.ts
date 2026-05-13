import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/demo-session';

test.describe('Depth: investments, forecasting, tax, reports, audit, family, settings', () => {
  test('Workspace surfaces expose documented headings and modal controls', async ({ page }) => {
    await loginAsDemo(page);

    await test.step('Investments: Add Investment opens modal then closes cleanly', async () => {
      await page.goto('/app/investments');
      await expect(page.getByTestId('page-investments')).toBeVisible();
      await page.getByRole('button', { name: /Add Investment/i }).click();
      await expect(page.getByRole('heading', { name: /Add Asset/i })).toBeVisible();
      await page
        .locator('div.fixed')
        .filter({ has: page.getByRole('heading', { name: /Add Asset/i }) })
        .getByRole('button', { name: /^Close$/ })
        .click();
      await expect(page.getByRole('heading', { name: /Add Asset/i })).toHaveCount(0);
    });

    await test.step('Forecasting: planner headline renders', async () => {
      await page.goto('/app/forecasting');
      await expect(page.getByTestId('page-forecasting')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Net Worth Forecasting/i })).toBeVisible();
    });

    await test.step('Tax engine: optimisation headline renders', async () => {
      await page.goto('/app/tax');
      await expect(page.getByTestId('page-tax')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Tax Optimization Engine/i })).toBeVisible();
    });

    await test.step('Reports: builder exposes print/export affordance', async () => {
      await page.goto('/app/reports');
      await expect(page.getByTestId('page-reports')).toBeVisible();
      await expect(page.getByRole('button', { name: /Print \/ PDF/i })).toBeVisible();
    });

    await test.step('Audit log listing shell', async () => {
      await page.goto('/app/audit');
      await expect(page.getByTestId('page-audit')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Audit Logs/i })).toBeVisible();
    });

    await test.step('Family workspace: onboarding OR active household header', async () => {
      await page.goto('/app/family');
      await expect(page.getByTestId('page-family')).toBeVisible();
      const onboardingTitle = page.getByRole('heading', { name: /Family & Joint Accounts/i });
      if (await onboardingTitle.isVisible()) {
        await expect(page.getByRole('button', { name: /Create Family/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Join Family/i })).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: /Workspace/i }).first()).toBeVisible();
      }
    });

    await test.step('Settings: profile card + dark mode toggle updates document class', async () => {
      await page.goto('/app/settings');
      await expect(page.getByTestId('page-settings')).toBeVisible();
      await expect(page.getByRole('heading', { name: /^Settings$/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /^Profile$/ })).toBeVisible();
      const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      await page.getByRole('switch', { name: /Dark mode/i }).click();
      const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(after).toBe(!before);
      await page.getByRole('switch', { name: /Dark mode/i }).click();
    });
  });
});
