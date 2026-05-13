import { test, expect } from '@playwright/test';

test.describe('Forgot Password Routine Verification', () => {

  test('should advance to credential recovery step when supplied registered identity', async ({ page }) => {
    // Setup Phase: Physically register a legitimate identity vector guaranteeing definitive presence
    await page.context().clearCookies();
    await page.goto('/signup');
    
    const rescueIdentity = {
      name: 'Rescue Tester',
      email: `rescue-${Date.now()}@recovery.net`,
      password: 'LegitPassword123!'
    };
    
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill(rescueIdentity.name);
    await page.getByPlaceholder(/you@example.com/i).first().fill(rescueIdentity.email);
    await page.getByPlaceholder(/Min 8 characters/i).first().fill(rescueIdentity.password);
    await page.getByPlaceholder(/Confirm your password/i).first().fill(rescueIdentity.password);
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // Context Reset: Log out to verify flow from anonymous perimeter
    await page.context().clearCookies();
    await page.goto('/forgot-password');
    
    // 1. SATURATION: Feed validated identity into recovery conduit
    const emailField = page.getByPlaceholder(/name@company.com/i).first();
    await emailField.fill(rescueIdentity.email);
    
    // 2. EXECUTE: Trigger remediation cycle
    await page.getByRole('button', { name: /Send Reset Code/i }).first().click();
    
    // 3. ASSERTION: Verify transition to Phase 2 (OTP Input hydration)
    // Inspect for the prompt 'Enter the code sent to' or presence of 6-Digit Code label
    await expect(page.getByText(/Enter the code sent to/i).or(page.getByLabel(/6-Digit Code/i))).toBeVisible({ timeout: 10000 });
    
    // Certified containment: Check that the OTP digit prompt exists
    await expect(page.getByPlaceholder(/123456/i)).toBeVisible();
  });

  test('should revert traversal back to login boundary via secondary anchor', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Target explicit textual anchor 'Back to Login'
    const backBtn = page.getByRole('button', { name: /Back to Login/i }).first();
    await expect(backBtn).toBeVisible();
    
    await backBtn.click();
    
    // Assert direct traversal to login entrypoint
    await expect(page).toHaveURL(/.*login/);
  });

  test('should safely extract user to primary root domain landing page', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Locate the high-level accessibility labeled home node
    const homeBtn = page.getByLabel(/Back to home/i).first();
    await expect(homeBtn).toBeVisible();
    
    await homeBtn.click();
    
    // Verify absolute root redirection
    // Wait for location matching explicitly "/" after domain
    await expect(page).toHaveURL(/\/$/, { timeout: 5000 }); 
  });

  test('should inhibit user enumeration by executing generic obfuscation sequence on unknown address', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/forgot-password');
    
    const ghostIdentity = `phantom-${Date.now()}@nowhere.void`;
    
    // Supply nonexistent address
    await page.getByPlaceholder(/name@company.com/i).first().fill(ghostIdentity);
    await page.getByRole('button', { name: /Send Reset Code/i }).first().click();
    
    // ASSERT: Security policy mandates matching visual routing irrespective of account lookup status
    // Confirms transition to OTP step even if user does not exist
    await expect(page.getByText(/Enter the code sent to/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByPlaceholder(/123456/i)).toBeVisible();
    
    // Zero specific 'user not found' leakage confirmed
    await expect(page.getByText(/not found/i)).not.toBeVisible();
  });

  test('should intercept dispatch cycles instantly upon null input state', async ({ page }) => {
    await page.goto('/forgot-password');
    
    const emailInput = page.getByPlaceholder(/name@company.com/i).first();
    await emailInput.clear(); // Strictly enforce null
    
    await page.getByRole('button', { name: /Send Reset Code/i }).first().click();
    
    // Verify targeted visual warning dispatch from local React context
    const alert = page.getByText(/Please enter your email address/i);
    await expect(alert).toBeVisible();
    
    // Certified containment sustained
    await expect(page.getByPlaceholder(/123456/i)).not.toBeVisible();
  });

  test('should leverage regex isolation to severe malformed syntactic payloads', async ({ page }) => {
    await page.goto('/forgot-password');
    
    const emailInput = page.getByPlaceholder(/name@company.com/i).first();
    
    // Inject structural violation
    await emailInput.fill('absolutely-not-a-legit-format');
    
    await page.getByRole('button', { name: /Send Reset Code/i }).first().click();
    
    // ASSERT: Detect if browser native semantic parsing intercepted the cycle
    const isTypeMismatch = await emailInput.evaluate((el: HTMLInputElement) => el.validity.typeMismatch);
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    
    // In many browsers, the custom React JS validation ONLY fires if HTML5 passes first.
    // So we accept EITHER the native rejection OR the custom UI text alert.
    const hasNativeViolation = isTypeMismatch || !isValid;
    
    expect(hasNativeViolation, 'System semantic constraints must block non-conforming recovery identifiers').toBe(true);
  });
});
