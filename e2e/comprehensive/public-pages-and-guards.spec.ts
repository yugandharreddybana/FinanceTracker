import { test, expect } from '@playwright/test';

test.describe('Public marketing & legal pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('Landing renders hero and navigation entry points (Sign In / Get Started)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('page-landing')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Your Money/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Started/i }).first()).toBeVisible();
  });

  test('Login shows credential form, demo shortcut, and signup cross-link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('page-login')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
    await expect(page.getByTestId('login-demo-button')).toBeVisible();
    await expect(page.getByRole('link', { name: /Create one free/i })).toBeVisible();
  });

  test('Signup exposes registration fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByTestId('page-signup')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();
  });

  test('Forgot password starts on email step', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByTestId('page-forgot-password')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Reset Password/i })).toBeVisible();
  });

  test('Reset password without token shows validation error state', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByTestId('page-reset-password')).toBeVisible();
    await expect(page.getByText(/authentic reset token|reset token/i)).toBeVisible();
  });

  test('Legal/info: privacy', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByTestId('page-info-privacy')).toBeVisible();
  });

  test('Legal/info: terms', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByTestId('page-info-terms')).toBeVisible();
  });

  test('Legal/info: security', async ({ page }) => {
    await page.goto('/security');
    await expect(page.getByTestId('page-info-security')).toBeVisible();
  });

  test('Legal/info: contact', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByTestId('page-info-contact')).toBeVisible();
  });
});

test.describe('Auth guards on deep links', () => {
  test('Unauthenticated visit to /app/dashboard redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByTestId('page-login')).toBeVisible();
  });
});
