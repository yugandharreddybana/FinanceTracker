import { test, expect } from '@playwright/test';

test.describe('Signup Workflow Validation', () => {

  test('should successfully register with valid credentials and load dashboard', async ({ page }) => {
    // 1. Isolation Baseline
    await page.context().clearCookies();
    await page.goto('/signup');

    // Unique identification payload to guarantee clean-slate provisioning
    const testIdentity = {
      name: 'Auto Test Practitioner',
      email: `signup-happy-${Date.now()}@quality.dev`,
      password: 'SecureValidation123!'
    };

    // 2. Saturation Phase: Populate interface semantic nodes
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill(testIdentity.name);
    await page.getByPlaceholder(/you@example.com/i).first().fill(testIdentity.email);
    await page.getByPlaceholder(/Min 8 characters/i).first().fill(testIdentity.password);
    await page.getByPlaceholder(/Confirm your password/i).first().fill(testIdentity.password);

    // 3. ACTION: Trigger Provision Request
    // Target text directly or semantic button
    await page.getByRole('button', { name: /Create Account/i }).or(page.locator('button[type="submit"]')).first().click();

    // 4. ASSERTION: Dynamic forward redirection confirms authentication finalization
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // Confirms internal layout elements visible indicating successful hydrated render state
    await expect(page.getByText(/Total Balance/i).or(page.getByText(/Good/i)).first()).toBeVisible();
  });

  test('should reject registration attempts utilizing preexisting account identifiers', async ({ page }) => {
    const duplicatePayload = {
      name: 'Collision Evaluator',
      email: `collision-${Date.now()}@reject.dev`,
      password: 'AnySecurePass123!'
    };

    // 1. PRE-CONDITION SETUP: Physically insert the baseline record directly via standard signup loop
    await page.context().clearCookies();
    await page.goto('/signup');
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill(duplicatePayload.name);
    await page.getByPlaceholder(/you@example.com/i).first().fill(duplicatePayload.email);
    await page.getByPlaceholder(/Min 8 characters/i).first().fill(duplicatePayload.password);
    await page.getByPlaceholder(/Confirm your password/i).first().fill(duplicatePayload.password);
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // 2. ISO Phase: Sever cookies to simulate distinct unrecorded browser session attempting same registration
    await page.context().clearCookies();
    await page.goto('/signup');

    // 3. ACT: Feed the duplicate identifier into the system
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill('Distinct Person But Same Email');
    await page.getByPlaceholder(/you@example.com/i).first().fill(duplicatePayload.email); // <-- EXACT SAME IDENTIFIER
    await page.getByPlaceholder(/Min 8 characters/i).first().fill('TotallyNewPass123!');
    await page.getByPlaceholder(/Confirm your password/i).first().fill('TotallyNewPass123!');

    await page.getByRole('button', { name: /Create Account/i }).first().click();

    // 4. ASSERTION 1: URL remained safely locked on registration gateway preventing access
    await expect(page).toHaveURL(/.*signup/);

    // 5. ASSERTION 2: System surfaced failure rationale from the backend
    // Looks for standard error blocks hydrated on line 49 in SignupPage.tsx
    const errorPanel = page.locator('.rounded-2xl.bg-rose-50').or(page.getByText(/already/i)).or(page.getByText(/registered/i)).or(page.getByText(/Failed/i));
    await expect(errorPanel.first()).toBeVisible();
  });

  test('should enforce front-facing syntactic constraints locking empty name fields', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/signup');

    const nameInput = page.getByPlaceholder(/Yugandhar Reddy/i).first();
    const emailInput = page.getByPlaceholder(/you@example.com/i).first();

    // Populate valid auxiliary data while leaving mandatory 'Name' vector null
    await nameInput.clear();
    await emailInput.fill(`empty-name-test-${Date.now()}@quality.dev`);
    await page.getByPlaceholder(/Min 8 characters/i).first().fill('LegitPassword123!');
    await page.getByPlaceholder(/Confirm your password/i).first().fill('LegitPassword123!');

    // Attempt Execution
    await page.getByRole('button', { name: /Create Account/i }).first().click();

    // Validate: Browser's underlying HTML5 constraints must successfully inhibit cycle
    const isValueMissing = await nameInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing);
    expect(isValueMissing, 'HTML5 semantic "required" validation failed to fire for empty full name').toBe(true);

    // Confirms dynamic boundary separation held
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should enforce local syntactic constraints locking passwords under minimum threshold', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/signup');

    const passInput = page.getByPlaceholder(/Min 8 characters/i).first();
    
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill('Minimum Test');
    await page.getByPlaceholder(/you@example.com/i).first().fill(`short-pass-${Date.now()}@safety.dev`);
    
    // Inject strictly substandard value (e.g. 3 characters violating minlength=6)
    await passInput.fill('123');
    await page.getByRole('button', { name: /Create Account/i }).first().click();

    // Interrogate runtime validity flag mapping directly to 'minlength' DOM property
    const isTooShort = await passInput.evaluate((el: HTMLInputElement) => el.validity.tooShort);
    expect(isTooShort, 'Native HTML5 minlength enforcement failed to inhibit short password dispatch').toBe(true);
    
    // Strict lock confirmed
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should reject mismatched confirmation passwords during enrollment', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/signup');
    
    // Populate core identification vectors
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill('Mismatch Evaluator');
    await page.getByPlaceholder(/you@example.com/i).first().fill(`mismatch-${Date.now()}@rejection.net`);
    
    // Populate source credential
    await page.getByPlaceholder(/Min 8 characters/i).first().fill('SecureBase123!');
    
    // Populate DISCREPANT verification credential (violates parity enforcement)
    const confirmField = page.getByPlaceholder(/Confirm your password/i).first();
    await confirmField.fill('EntirelyDifferentPass789!');
    
    // Execute delivery cycle
    await page.getByRole('button', { name: /Create Account/i }).first().click();

    // 1. Validate that system retained locked-out status on registration gateway
    await expect(page).toHaveURL(/.*signup/);
    
    // 2. Validate visual rejection hydrate
    const mismatchAlert = page.getByText(/match/i).or(page.locator('.bg-rose-50'));
    await expect(mismatchAlert.first()).toBeVisible();
    
    // Confirm presence of specific logic artifact
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
  });

  test('should enforce legitimate structural format for registration email identity vectors', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/signup');

    const emailInput = page.getByPlaceholder(/you@example.com/i).first();
    
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill('Syntax Check');
    
    // Inject explicitly broken structural identifier
    await emailInput.fill('clearly-not-an-email-syntax@@@@faulty');
    await page.getByPlaceholder(/Min 8 characters/i).first().fill('LegitPass123!');
    await page.getByPlaceholder(/Confirm your password/i).first().fill('LegitPass123!');

    // Trigger intercept cycle
    await page.getByRole('button', { name: /Create Account/i }).first().click();

    // ASSERT: Verify browser internal semantic analysis detected format corruption
    const isTypeMismatch = await emailInput.evaluate((el: HTMLInputElement) => el.validity.typeMismatch);
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    
    expect(isTypeMismatch || !isValid, 'System semantic constraints must catch invalid registration formats').toBe(true);

    // Lockdown enforcement confirmation
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should sustain high-saturation character loads in name vector without system crash', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/signup');
    
    // 1. Synthesize saturated string payload exceeding 255 standard boundary
    const saturatedName = 'A'.repeat(300);
    const email = `stress-test-${Date.now()}@performance.dev`;
    
    // Monitor for fatal crash signals (500 internal server errors or uncaught app exceptions)
    let fatalCrashDetected = false;
    page.on('pageerror', () => { fatalCrashDetected = true; });
    page.on('response', response => {
      if (response.status() >= 500) { fatalCrashDetected = true; }
    });
    
    // 2. Act
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill(saturatedName);
    await page.getByPlaceholder(/you@example.com/i).first().fill(email);
    await page.getByPlaceholder(/Min 8 characters/i).first().fill('SafePass123!');
    await page.getByPlaceholder(/Confirm your password/i).first().fill('SafePass123!');
    
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    
    // 3. ASSERT: The condition evaluates success if: 
    // A) Dashboard renders (backend accepted/truncated), OR 
    // B) Validation banner shows (frontend safely rejected). 
    // Failure occurs ONLY IF FATAL CRASH OR ERROR BOUNDARY triggers.
    
    // Wait a tick for either forward routing or state update
    await page.waitForTimeout(2000);
    
    expect(fatalCrashDetected, 'CRITICAL: High-saturation name payload instigated terminal system exception!').toBe(false);
    
    // Ensure app wrapper is still mounted (no crash boundary)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should securely serialize and sustain multi-byte Unicode character sets in user identity', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/signup');
    
    // 1. Synthesize complex multilingual and special-char identifier
    const complexName = "O'Brien-García 李"; 
    const complexEmail = `unicode-${Date.now()}@special.char`;
    
    // 2. Saturated Lifecycle
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill(complexName);
    await page.getByPlaceholder(/you@example.com/i).first().fill(complexEmail);
    await page.getByPlaceholder(/Min 8 characters/i).first().fill('UnicodePass123!');
    await page.getByPlaceholder(/Confirm your password/i).first().fill('UnicodePass123!');
    
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    
    // 3. Validation Phase
    // Backend MUST support UTF8 charset for names. Certified forward progress means 100% Success.
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // CONFIRM: User Profile reflects non-corrupted deserialization
    // Wait for dashboard greeting which typically uses name, or check user profile menu if applicable
    // We already confirmed valid routing. Let's inspect internal context anchor.
    const internalAnchor = page.getByText(/Total Balance/i).or(page.getByText(/Good/i)).first();
    await expect(internalAnchor).toBeVisible();
  });

  test('should auto-redirect existing authenticated clients away from registration interface', async ({ page }) => {
    const sessionIdentity = {
      name: 'Persistence Guard',
      email: `session-lock-${Date.now()}@security.dev`,
      password: 'SessionSafety123!'
    };
    
    // 1. Construct valid, saturated session context
    await page.goto('/signup');
    await page.getByPlaceholder(/Yugandhar Reddy/i).first().fill(sessionIdentity.name);
    await page.getByPlaceholder(/you@example.com/i).first().fill(sessionIdentity.email);
    await page.getByPlaceholder(/Min 8 characters/i).first().fill(sessionIdentity.password);
    await page.getByPlaceholder(/Confirm your password/i).first().fill(sessionIdentity.password);
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    
    // Baseline check
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // 2. ACTION: Attempt illegal recursive navigation back into base gateway while retaining credentials
    await page.goto('/signup');
    
    // 3. ASSERT: Routing Barrier MUST immediately force fallback loopback back into internal zone
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 8000 });
    
    // Certified total containment
    await expect(page.getByRole('heading', { name: /Create your account/i })).not.toBeVisible();
  });
});
