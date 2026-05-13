import { test, expect, request } from '@playwright/test';

test.describe('Secure Password Remediation Logic Verification', () => {

  test('should present high-fidelity restorative interface when provided valid token structure', async ({ page }) => {
    await page.goto('/reset-password?token=test_dummy_token');
    
    // Check primary heading presence
    await expect(page.getByText(/Finalize Reset/i)).toBeVisible();
    
    // Verify critical input fields are hydrated and NOT disabled
    const passwordInput = page.getByPlaceholder(/Enter new password/i).first();
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).not.toBeDisabled();
    
    const confirmInput = page.getByPlaceholder(/Repeat new password/i).first();
    await expect(confirmInput).toBeVisible();
    await expect(confirmInput).not.toBeDisabled();
  });

  test('should successfully restore full account access lifecycle using authentic system token', async ({ page }) => {
    // 1. SETUP: Forge new user identity for this runtime run
    const email = `reset-target-${Date.now()}@verification.net`;
    const baseApiUrl = 'http://localhost:4000';
    
    const apiContext = await request.newContext();
    
    // Step A: Register physical account
    await apiContext.post(`${baseApiUrl}/api/auth/register`, {
      data: { name: 'Reset User', email, password: 'InitialOldPass123!' }
    });
    
    // Step B: Trigger forgot-password to acquire real generated token from dev payload
    const fpResponse = await apiContext.post(`${baseApiUrl}/api/auth/forgot-password`, {
      data: { email }
    });
    const fpJson = await fpResponse.json();
    const realToken = fpJson.dev_token;
    
    expect(realToken, 'Dev backend failed to yield diagnostic token vector').toBeDefined();

    // 2. EXECUTE: Perform in-browser restoration walkthrough
    await page.context().clearCookies();
    await page.goto(`/reset-password?token=${realToken}`);
    
    // Supply matching elevated strength credentials
    await page.getByPlaceholder(/Enter new password/i).first().fill('NewTargetSecurePass789!');
    await page.getByPlaceholder(/Repeat new password/i).first().fill('NewTargetSecurePass789!');
    
    await page.getByRole('button', { name: /Finalize Password Reset/i }).first().click();
    
    // 3. ASSERT: Success hydrated state reached
    await expect(page.getByText(/Mission Complete/i).or(page.getByText(/restored successfully/i)).first()).toBeVisible({ timeout: 8000 });
    
    // Verify the final loopback mechanism to the login gate
    const loginBtn = page.getByRole('button', { name: /Proceed to Login/i }).first();
    await expect(loginBtn).toBeVisible();
    
    // 4. POST-STEP VERIFICATION: Certify new credentials actually permit login
    await loginBtn.click();
    await expect(page).toHaveURL(/.*login/);
    
    await page.getByPlaceholder(/you@example.com/i).first().fill(email);
    await page.getByPlaceholder(/••••••••/i).first().fill('NewTargetSecurePass789!');
    await page.getByRole('button', { name: /Sign In/i }).first().click();
    
    // System should certify new password and yield access to cockpit
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    await apiContext.dispose();
  });

  test('should execute catastrophic interrupt and pop error notifications on defunct/invalid tokens', async ({ page }) => {
    await page.context().clearCookies();
    
    // Inject explicitly fraudulent random entropy string token
    const deadToken = `garbage-vector-${Math.random()}`;
    await page.goto(`/reset-password?token=${deadToken}`);
    
    await page.getByPlaceholder(/Enter new password/i).first().fill('LegitLengthPass123!');
    await page.getByPlaceholder(/Repeat new password/i).first().fill('LegitLengthPass123!');
    
    await page.getByRole('button', { name: /Finalize Password Reset/i }).first().click();
    
    // Verify backend severance hydrates error alert on the frontend
    const errorAlert = page.getByText(/Invalid or expired reset token/i).or(page.getByText(/Failed to reset password/i));
    await expect(errorAlert.first()).toBeVisible({ timeout: 5000 });
    
    // Verify application is retained on the remediation viewport
    await expect(page).toHaveURL(/.*reset-password/);
  });

  test('should prevent delivery cycle upon non-identical secondary password confirming vector', async ({ page }) => {
    // Navigate with a valid dummy token to keep form active
    await page.goto('/reset-password?token=active_test_token');
    
    // Input discrepant credential vectors
    await page.getByPlaceholder(/Enter new password/i).first().fill('FirstTarget123!');
    await page.getByPlaceholder(/Repeat new password/i).first().fill('ACompletelyDifferentPass456!');
    
    await page.getByRole('button', { name: /Finalize Password Reset/i }).first().click();
    
    // Verify explicit logic exception hydration
    const mismatchText = page.getByText(/match/i).or(page.locator('.bg-red-500'));
    await expect(mismatchText.first()).toBeVisible();
    
    // Certified containment: UI should NOT present success screen
    await expect(page.getByText(/Mission Complete/i)).not.toBeVisible();
  });

  test('should instantly bounce pre-authenticated clients out of remediation cycle into cockpit', async ({ page }) => {
    // Verify architectural containment: logging in should inherently block access to reset interface
    // Setup step: Use standard demo login mechanism to establish valid active session cookie
    await page.goto('/login');
    await page.getByRole('button', { name: /Try Demo Account/i }).first().click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // Physical violation attempt: force navigate to /reset-password while saturated
    await page.goto('/reset-password');
    
    // Validated repulsion: Router layer detects presence and immediately triggers Navigate(replace)
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 5000 });
    await expect(page.getByText(/Finalize Reset/i)).not.toBeVisible();
  });

});
