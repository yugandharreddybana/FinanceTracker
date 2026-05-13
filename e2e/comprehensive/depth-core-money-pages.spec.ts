import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/demo-session';

test.describe('Depth: dashboard, transactions, accounts, budgets, savings', () => {
  test('Primary surfaces, filters, and modal lifecycles behave as documented', async ({ page }) => {
    await loginAsDemo(page);

    await test.step('Dashboard shows greeting and balance masking control', async () => {
      await page.goto('/app/dashboard');
      await expect(page.getByTestId('page-dashboard')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);
      const maskBtn = page.getByRole('button', { name: /Hide balance amounts|Show balance amounts/i });
      await maskBtn.click();
      await expect(page.getByText('•••••••').first()).toBeVisible();
      await maskBtn.click();
    });

    await test.step('Transactions: filters and Smart Add modal', async () => {
      await page.goto('/app/transactions');
      await expect(page.getByTestId('page-transactions')).toBeVisible();
      await expect(page.getByRole('heading', { name: /^Transactions$/ })).toBeVisible();
      await expect(page.getByPlaceholder(/Search transactions/i)).toBeVisible();
      await page.getByRole('button', { name: /↑ Income/i }).click();
      await page.getByRole('button', { name: /Add Smart/i }).click();
      await expect(page.getByTestId('smart-add-modal')).toBeVisible();
      await page.getByRole('button', { name: /Close Smart Add/i }).click();
      await expect(page.getByTestId('smart-add-modal')).toHaveCount(0);

      if (await page.getByTestId('empty-transactions').isVisible()) {
        await expect(page.getByTestId('empty-transactions')).toContainText(/No transactions found/i);
      } else {
        await expect(page.getByRole('button', { name: /^Delete / }).first()).toBeVisible();
      }
    });

    await test.step('Bank accounts: Add Account modal open and close via header dismiss control', async () => {
      await page.goto('/app/accounts');
      await expect(page.getByTestId('page-accounts')).toBeVisible();
      await page.getByRole('button', { name: /Add Account/i }).click();
      await expect(page.locator('#account-modal-title')).toContainText(/New Account/);
      const accountModal = page.locator('[aria-labelledby="account-modal-title"]');
      await accountModal.locator('button').filter({ has: page.locator('svg') }).first().click();
      await expect(page.locator('#account-modal-title')).toHaveCount(0);

      if (await page.getByTestId('empty-accounts').isVisible()) {
        await expect(page.getByTestId('empty-accounts')).toContainText(/No bank accounts yet/i);
      } else {
        await expect(page.getByRole('button', { name: /^Edit / }).first()).toBeVisible();
      }
    });

    await test.step('Budgets: spending summary and budget modal', async () => {
      await page.goto('/app/budgets');
      await expect(page.getByTestId('page-budgets')).toBeVisible();
      await expect(page.getByText(/Monthly Spending/i)).toBeVisible();
      await page.getByRole('button', { name: /Add Budget/i }).click();
      await expect(page.locator('#budget-modal-title')).toContainText(/New Budget/);
      const budgetModal = page.locator('[aria-labelledby="budget-modal-title"]');
      await budgetModal.locator('button').filter({ has: page.locator('svg') }).first().click();
      await expect(page.locator('#budget-modal-title')).toHaveCount(0);
    });

    await test.step('Savings goals: Add Goal modal', async () => {
      await page.goto('/app/savings');
      await expect(page.getByTestId('page-savings')).toBeVisible();
      await page.getByRole('button', { name: /Add Goal/i }).click();
      await expect(page.locator('#savings-modal-title')).toContainText(/New Savings Goal/);
      const savingsModal = page.locator('[aria-labelledby="savings-modal-title"]');
      await savingsModal.locator('button').filter({ has: page.locator('svg') }).first().click();
      await expect(page.locator('#savings-modal-title')).toHaveCount(0);
    });
  });
});
