import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/demo-session';

test.describe('Global shell: top bar, palette, Smart Add, notifications, floating Oracle', () => {
  test('Keyboard and buttons drive command palette, Smart Add, notifications, and compact Oracle', async ({
    page,
  }) => {
    await loginAsDemo(page);

    await test.step('Top bar is stable across authenticated shell', async () => {
      await expect(page.getByTestId('top-bar')).toBeVisible();
      await expect(page.getByTestId('top-bar-smart-add')).toBeVisible();
      await expect(page.getByTestId('top-bar-notifications')).toBeVisible();
    });

    await test.step('Ctrl+K toggles command palette; Escape closes it', async () => {
      await page.keyboard.press('Control+K');
      await expect(page.getByTestId('command-palette')).toBeVisible();
      await expect(page.getByPlaceholder(/Search pages and actions/i)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('command-palette')).toHaveCount(0);
    });

    await test.step('Palette empty state when query matches nothing', async () => {
      await page.keyboard.press('Control+K');
      await page.getByPlaceholder(/Search pages and actions/i).fill('___no_such_route_xyz___');
      await expect(page.getByTestId('command-palette-empty')).toBeVisible();
      await expect(page.getByText(/No matches for/i)).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('Palette navigates to Budgets via click', async () => {
      await page.keyboard.press('Control+K');
      await page.getByRole('button', { name: /Budgets/i }).click();
      await expect(page).toHaveURL(/\/app\/budgets/);
      await expect(page.getByTestId('page-budgets')).toBeVisible();
    });

    await test.step('Top bar Smart Add opens modal; explicit close control dismisses', async () => {
      await page.getByTestId('top-bar-smart-add').click();
      await expect(page.getByTestId('smart-add-modal')).toBeVisible();
      await expect(page.locator('#smart-add-modal-title')).toContainText(/Smart Add/i);
      await page.getByRole('button', { name: /Close Smart Add/i }).click();
      await expect(page.getByTestId('smart-add-modal')).toHaveCount(0);
    });

    await test.step('Notifications opens dialog with aria-label', async () => {
      await page.getByTestId('top-bar-notifications').click();
      await expect(page.getByTestId('notification-center-panel')).toBeVisible();
      await expect(page.getByRole('dialog', { name: /Notifications/i })).toBeVisible();
      await page.getByRole('button', { name: /Close notifications/i }).click();
      await expect(page.getByTestId('notification-center-panel')).toHaveCount(0);
    });

    await test.step('Floating sparkles opens compact Oracle (page-insights-compact)', async () => {
      await page.getByTestId('floating-ai-oracle-button').click();
      await expect(page.getByTestId('page-insights-compact')).toBeVisible();
      await expect(page.getByPlaceholder(/Ask about your finances/i)).toBeVisible();
      await page.getByRole('button', { name: /Close chat/i }).click();
      await expect(page.getByTestId('page-insights-compact')).toHaveCount(0);
    });

    await test.step('Dedicated /app/insights stays full layout (page-insights)', async () => {
      await page.goto('/app/insights');
      await expect(page.getByTestId('page-insights')).toBeVisible();
      await expect(page.getByRole('button', { name: /Refresh/i }).first()).toBeVisible();
    });

    await test.step('Mobile viewport surfaces FAB Smart Add wired to same modal', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/app/dashboard');
      await expect(page.getByTestId('mobile-smart-add-fab')).toBeVisible();
      await page.getByTestId('mobile-smart-add-fab').click();
      await expect(page.getByTestId('smart-add-modal')).toBeVisible();
      await page.getByRole('button', { name: /Close Smart Add/i }).click();
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});
