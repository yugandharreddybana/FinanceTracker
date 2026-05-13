import { test, expect } from '@playwright/test';

test.describe('Authentication Interface', () => {
  
  test('should show error messages on invalid login submission', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    await page.getByPlaceholder(/you@example.com/i).first().fill('nonexistent@user.dev');
    await page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first().fill('WrongPassStillLong123!');

    await page.getByRole('button', { name: /Sign In/i }).or(page.getByRole('button', { name: /Log In/i })).first().click();

    await expect(page).toHaveURL(/.*login/);
    const errorBanner = page.getByText(/Invalid credentials/i).or(page.getByText(/wrong/i)).or(page.locator('.rounded-2xl.bg-rose-50'));
    await expect(errorBanner.first()).toBeVisible();
  });

  test('should successfully direct from login to signup view', async ({ page }) => {
    await page.goto('/login');
    
    // Click switch to signup link
    await page.getByRole('link', { name: /Create one/i }).or(page.getByRole('link', { name: /Sign up/i })).first().click();
    
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should support strong password validation indicators on signup', async ({ page }) => {
    await page.goto('/signup');
    
    const passInput = page.locator('input[type="password"]').first();
    await passInput.fill('123');
    
    // Verify that feedback element is present indicating progress toward security requirements
    await expect(page.getByText(/Weak/i).or(page.locator('.bg-negative'))).toBeVisible();
  });
});
