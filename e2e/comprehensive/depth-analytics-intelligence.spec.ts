import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/demo-session';

test.describe('Depth: recurring, loans, net worth, health, carbon, categories, insights, income, review', () => {
  test('Analytics and intelligence pages expose controls documented in UI copy', async ({ page }) => {
    await loginAsDemo(page);

    await test.step('Recurring: Add Recurring modal with Cancel', async () => {
      await page.goto('/app/recurring');
      await expect(page.getByTestId('page-recurring')).toBeVisible();
      await page.getByRole('button', { name: /Add Recurring/i }).click();
      await expect(page.getByRole('heading', { name: /Add Recurring/i })).toBeVisible();
      await page.getByRole('button', { name: /^Cancel$/i }).click();
      await expect(page.getByRole('heading', { name: /Add Recurring/i })).toHaveCount(0);
    });

    await test.step('Loans: Add Loan modal heading', async () => {
      await page.goto('/app/loans');
      await expect(page.getByTestId('page-loans')).toBeVisible();
      await page.getByRole('button', { name: /Add Loan/i }).click();
      await expect(page.locator('#loan-modal-title')).toContainText(/New Loan/);
      await page.locator('[aria-labelledby="loan-modal-title"]').getByRole('button', { name: /^Cancel$/ }).click();
      await expect(page.locator('#loan-modal-title')).toHaveCount(0);
    });

    await test.step('Net worth: primary hero metrics visible', async () => {
      await page.goto('/app/networth');
      await expect(page.getByTestId('page-networth')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Net Worth/i })).toBeVisible();
    });

    await test.step('Health score narrative loads', async () => {
      await page.goto('/app/health');
      await expect(page.getByTestId('page-health')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Health Score/i })).toBeVisible();
    });

    await test.step('Carbon footprint dashboard loads', async () => {
      await page.goto('/app/carbon');
      await expect(page.getByTestId('page-carbon')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Carbon Footprint/i })).toBeVisible();
    });

    await test.step('Categories: open Add Category glass modal then dismiss via backdrop', async () => {
      await page.goto('/app/categories');
      await expect(page.getByTestId('page-categories')).toBeVisible();
      await expect(page.getByRole('heading', { name: /^Categories$/ })).toBeVisible();
      await page.getByText('New Category', { exact: true }).click();
      await expect(page.getByRole('heading', { name: /Add Category/i })).toBeVisible();
      await page.getByTestId('categories-modal-backdrop').click({ position: { x: 8, y: 8 } });
      await expect(page.getByRole('heading', { name: /Add Category/i })).toHaveCount(0);
    });

    await test.step('AI Insights full page: oracle panel + refresh control', async () => {
      await page.goto('/app/insights');
      await expect(page.getByTestId('page-insights')).toBeVisible();
      await expect(page.getByRole('heading', { name: /AI Insights/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Refresh$/ })).toBeVisible();
      await expect(page.getByPlaceholder(/Ask about your finances/i)).toBeVisible();
    });

    await test.step('Income analytics: Add Income affordance', async () => {
      await page.goto('/app/income');
      await expect(page.getByTestId('page-income')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Income Analytics/i })).toBeVisible();
      await page.getByRole('button', { name: /Add Income/i }).click();
      await expect(page.getByRole('heading', { name: /New Income Source/i })).toBeVisible();
      await page
        .locator('div.fixed')
        .filter({ has: page.getByRole('heading', { name: /New Income Source/i }) })
        .getByRole('button', { name: /^Close$/ })
        .click();
      await expect(page.getByRole('heading', { name: /New Income Source/i })).toHaveCount(0);
    });

    await test.step('Monthly review cinematic header renders', async () => {
      await page.goto('/app/review');
      await expect(page.getByTestId('page-review')).toBeVisible();
      await expect(page.locator('header').getByRole('heading', { level: 1 })).toBeVisible();
    });
  });
});
