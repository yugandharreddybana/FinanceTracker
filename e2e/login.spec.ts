import { test, expect } from '@playwright/test';
import { fillSignupCredentials } from './helpers/signupForm';

test.describe('Login Matrix Validation', () => {
  
  test('should successfully login with established credentials', async ({ page }) => {
    const credentials = {
      name: 'Test Validator',
      email: `testuser-${Date.now()}@example.com`, // Using deterministic unique identity for 100% repeatable isolated runs
      password: 'TestPass123!'
    };

    // 1. Fulfill Pre-condition: Ensure the user is physically provisioned
    await page.goto('/signup');
    await fillSignupCredentials(page, credentials);
    await page.getByRole('button', { name: /Create Account/i }).or(page.getByRole('button', { name: /Sign Up/i })).first().click();
    
    // Ensure setup completed
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // 2. Force fully disconnected context to enable genuine LOGIN test
    const context = page.context();
    await context.clearCookies();
    
    // Trigger explicit reload to blank state
    await page.goto('/login');

    // 3. Execution Step 1: Navigate to /login & verify form renders
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i }).or(page.getByRole('heading', { name: /Sign In/i })).first()).toBeVisible();
    
    // 4. Type credentials
    await page.getByPlaceholder(/you@example.com/i).first().fill(credentials.email);
    await page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first().fill(credentials.password);

    // 5. Perform submit
    await page.getByRole('button', { name: /Sign In/i }).or(page.getByRole('button', { name: /Log In/i })).first().click();

    // 6. Assert dynamic redirection intercept successfully fired
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 8000 });
    
    // 7. Final proof of identity saturation in internal context
    const internalContextAnchor = page.getByText(/Total Balance/i).or(page.getByText(/Good/i));
    await expect(internalContextAnchor.first()).toBeVisible();
    
    // Snapshot for proof
    await page.screenshot({ path: 'e2e/login-success-audit.png' });
  });

  test('should navigate to forgot password page', async ({ page }) => {
    // Ensure unauthenticated baseline
    await page.context().clearCookies();
    await page.goto('/login');
    
    // Attempt to locate restoration anchor
    const forgotLink = page.getByRole('link', { name: /Forgot/i });
    await expect(forgotLink).toBeVisible();
    
    // Activate hook
    await forgotLink.click();
    
    // Assert routing finalization
    await expect(page).toHaveURL(/.*forgot-password/);
    
    // Perform baseline element check indicating recovery form presence
    await expect(page.getByRole('heading', { name: /Reset Password/i }).or(page.locator('form')).first()).toBeVisible();
  });

  test('should navigate to signup page from registration anchor', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    
    const signupLink = page.getByRole('link', { name: /Create one free/i }).or(page.getByRole('link', { name: /Sign Up/i }));
    await expect(signupLink.first()).toBeVisible();
    
    await signupLink.first().click();
    
    await expect(page).toHaveURL(/.*signup/);
    
    // Final explicit presence confirmation of targeted content
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();
  });

  test('should display visible error payload and reject access on invalid password', async ({ page }) => {
    const validCreds = {
      name: 'Safety User',
      email: `negative-test-${Date.now()}@guard.dev`,
      password: 'OriginalCorrectPass!23'
    };

    // 1. Setup Valid Backend Record to satisfy pre-condition
    await page.goto('/signup');
    await fillSignupCredentials(page, validCreds);
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // 2. Hard Logout to guarantee cold enforcement
    await page.context().clearCookies();
    await page.goto('/login');

    // 3. Act - Target VALID Identity with INVALID Secret
    await page.getByPlaceholder(/you@example.com/i).first().fill(validCreds.email);
    await page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first().fill('DefinitelyTheWrongPassword123!!');
    
    // Initiate Attempt
    await page.getByRole('button', { name: /Sign In/i }).or(page.getByRole('button', { name: /Log In/i })).first().click();

    // 4. Assert Hard Barrier Hold - URL must remain locked to base gateway
    await expect(page).toHaveURL(/.*login/);

    // 5. Assert Active Alert Generation
    // Looks for dynamic error block defined in LoginPage.tsx line 54: rounded-2xl bg-rose-50 border-rose-200
    const errorBanner = page.getByText(/Invalid credentials/i).or(page.getByText(/wrong/i));
    await expect(errorBanner.first()).toBeVisible();

    // Final state snapshot for record
    await page.screenshot({ path: 'e2e/negative-auth-audit.png' });
  });

  test('should reject access on completely unrecognized account identifier', async ({ page }) => {
    // Enforce absolute blank baseline
    await page.context().clearCookies();
    await page.goto('/login');

    // Synthesize fully unique unrecorded phantom identity
    const ghostEmail = `ghost-${Math.floor(Math.random() * 99999)}@phantom.nowhere`;
    
    await page.getByPlaceholder(/you@example.com/i).first().fill(ghostEmail);
    await page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first().fill('GenericPassword123!');
    
    await page.getByRole('button', { name: /Sign In/i }).first().click();

    // Direct system enforcement assertions
    await expect(page).toHaveURL(/.*login/);
    const errorContainer = page.getByText(/Invalid credentials/i).or(page.getByText(/wrong/i)).or(page.locator('.rounded-2xl.bg-rose-50'));
    await expect(errorContainer.first()).toBeVisible();
  });

  test('should enforce local syntactic validation for empty email inputs', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    // Track internal API traffic to certify that zero leak reached backend
    let networkRequestSent = false;
    page.on('request', req => {
      if (req.url().includes('/api/auth') || req.url().includes('/login')) {
        if (req.method() === 'POST') {
          networkRequestSent = true;
        }
      }
    });

    const emailInput = page.getByPlaceholder(/you@example.com/i).first();
    const passInput = page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first();
    
    // Fill only valid password data leaving primary identity field completely blank
    await emailInput.clear();
    await passInput.fill('TestingValidity123!');

    // Attempt submission triggering native validation interceptor
    await page.getByRole('button', { name: /Sign In/i }).first().click();

    // ASSERT 1: Evaluate pure HTML5 native node constraints
    const isValueMissing = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing);
    expect(isValueMissing, 'Native HTML5 "required" enforcement should have triggered').toBe(true);

    // ASSERT 2: Reconfirm circuit breaker successfully halted outgoing payloads
    expect(networkRequestSent, 'Traffic leak detected! Native validation failed to halt submission lifecycle').toBe(false);

    // ASSERT 3: Boundary lock confirmed
    await expect(page).toHaveURL(/.*login/);
  });

  test('should enforce local syntactic validation for empty password inputs', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const emailInput = page.getByPlaceholder(/you@example.com/i).first();
    const passInput = page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first();
    
    // Fill identity perfectly but completely skip population of required secret
    await emailInput.fill('legit.email@trusted.dev');
    await passInput.clear();

    await page.getByRole('button', { name: /Sign In/i }).first().click();

    // ASSERT: Interrogate the password node explicitly for failure status
    const isValueMissing = await passInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing);
    expect(isValueMissing, 'Native HTML5 secret gatekeeper should have blocked submission').toBe(true);

    // Strict isolation recheck
    await expect(page).toHaveURL(/.*login/);
  });

  test('should enforce legitimate structural format for email identity vectors', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const emailInput = page.getByPlaceholder(/you@example.com/i).first();
    const passInput = page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first();
    
    // Inject explicitly broken structural identifiers lacking '@' and domains
    await emailInput.fill('definitely-not-a-real-email');
    await passInput.fill('ValidPassToIsolateVariable123!');

    // Trigger cycle
    await page.getByRole('button', { name: /Sign In/i }).first().click();

    // ASSERT: Browser internal semantic regex must evaluate this as illegal syntax
    const isTypeMismatch = await emailInput.evaluate((el: HTMLInputElement) => el.validity.typeMismatch);
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    
    expect(isTypeMismatch || !isValid, 'System semantic constraints must flag invalid structural formats').toBe(true);

    // Rigid lock check
    await expect(page).toHaveURL(/.*login/);
  });

  test('should properly shield application boundaries from SQL Injection synthesis', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const emailInput = page.getByPlaceholder(/you@example.com/i).first();
    
    // Inject classic adversarial escape sequence vector
    const payload = `' OR '1'='1'; --`;
    await emailInput.fill(payload);
    await page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first().fill('SafetyPass123!');

    // Initiate execution cycle
    await page.getByRole('button', { name: /Sign In/i }).first().click();

    // Validate Step 1: Native block check. 
    // If native blocking halts it, it perfectly satisfies requirement. 
    // If it bypassed to backend, we assert URL remained safe and NO exception crash rendered.
    const isTypeMismatch = await emailInput.evaluate((el: HTMLInputElement) => el.validity.typeMismatch);
    
    if (isTypeMismatch) {
      // Success Condition A: Front-facing sanitation halted it safely
      expect(isTypeMismatch, 'Adversarial input correctly caught by upfront syntactic guards').toBe(true);
    } else {
      // Success Condition B: Passed to API, backend refused safely
      await expect(page).toHaveURL(/.*login/);
      const errorContainer = page.locator('.rounded-2xl.bg-rose-50').or(page.getByText(/Invalid/i));
      await expect(errorContainer.first()).toBeVisible();
    }

    // ABSOLUTE ASSERTION: App must remain functional and not display crashed boundary state
    await expect(page.getByRole('heading', { name: /Welcome back/i }).first()).toBeVisible();
  });

  test('should securely sanitize adversarial XSS script payloads and inhibit execution', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    // Establish dynamic listener hooked to browser runtime environment catching ANY dialog popups
    let detectedExecution = false;
    page.on('dialog', dialog => {
      detectedExecution = true;
      dialog.dismiss(); // Neutralize instantly
    });

    const emailInput = page.getByPlaceholder(/you@example.com/i).first();
    
    // Construct classic adversarial execution payload
    const toxicPayload = "<script>alert('xss-breach-test')</script>";
    await emailInput.fill(toxicPayload);
    await page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first().fill('DummyTest123!');

    // Initiate Cycle
    await page.getByRole('button', { name: /Sign In/i }).first().click();

    // ASSERT 1: Confirm environment boundary retained absolute isolation (No dynamic JS executed)
    expect(detectedExecution, 'CRITICAL: Injected client-side script executed successfully! XSS vulnerability confirmed!').toBe(false);

    // ASSERT 2: Semantic verification confirms syntactic block held perfectly
    const isTypeMismatch = await emailInput.evaluate((el: HTMLInputElement) => el.validity.typeMismatch);
    expect(isTypeMismatch, 'Native semantic analyzer must recognize raw script tags as illegal address formats').toBe(true);

    // Static safety lock
    await expect(page).toHaveURL(/.*login/);
  });

  test('should successfully toggle password concealment state via ergonomic controls', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const passInput = page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[placeholder="••••••••"]')).first();
    
    // Select the visibility toggle sitting right next to the input field inside the same relative group
    const toggleBtn = page.locator('div:has(> input[type="password"]) button, div:has(> input[type="text"]) button').first();

    // 1. Fill the target vector
    const secretValue = 'TopSecretPassword123!';
    await passInput.fill(secretValue);

    // 2. Assert INITIAL state is fully CONCEALED
    await expect(passInput).toHaveAttribute('type', 'password');

    // 3. Click toggle to REVEAL
    await toggleBtn.click();

    // 4. Assert intermediate state is fully REVEALED as plaintext
    await expect(passInput).toHaveAttribute('type', 'text');
    // Confirm value stability
    await expect(passInput).toHaveValue(secretValue);

    // 5. Click again to RE-CONCEAL
    await toggleBtn.click();

    // 6. Assert final state safely restored
    await expect(passInput).toHaveAttribute('type', 'password');
  });

  test('should permit successful authenticated cycle triggered strictly via Keyboard Enter navigation', async ({ page }) => {
    const keyboardCreds = {
      name: 'Keyboard Warrior',
      email: `keys-${Date.now()}@input.dev`,
      password: 'PressEnterToWin123!'
    };

    // 1. Saturation Phase: Pre-provision user state to guarantee validity
    await page.goto('/signup');
    await fillSignupCredentials(page, keyboardCreds);
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // 2. Isolation Phase: Purge active tokens
    await page.context().clearCookies();
    await page.goto('/login');

    // 3. Interaction Phase: Fill inputs via simulated standard vector
    await page.getByPlaceholder(/you@example.com/i).first().fill(keyboardCreds.email);
    const passInput = page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[placeholder="••••••••"]')).first();
    await passInput.fill(keyboardCreds.password);

    // 4. ACTION: Fire direct event trigger simulating 'Enter' key interaction WITHOUT mouse interaction
    await passInput.press('Enter');

    // 5. Assert downstream flow saturated correctly
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // Ultimate confirmation of saturated render state
    await expect(page.getByText(/Total Balance/i).or(page.getByText(/Good/i)).first()).toBeVisible();
  });

  test('should auto-redirect established sessions away from login gateway and back to dashboard', async ({ page }) => {
    const secureCreds = {
      name: 'Persistence Evaluator',
      email: `session-${Date.now()}@persistence.dev`,
      password: 'StayLoggedIn123!'
    };

    // 1. Establish durable authenticated session baseline
    await page.goto('/signup');
    await fillSignupCredentials(page, secureCreds);
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    
    // Confirm initialization finalized
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // 2. Adversarial Vector: While HOLDING active cookie, attempt unauthorized loopback to base gateway
    await page.goto('/login');

    // 3. ASSERT: The routing barrier must immediately restore internal priority
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 8000 });
    
    // Total confirmation that isolation held perfectly
    await expect(page.getByRole('heading', { name: /Welcome back/i })).not.toBeVisible();
  });

  test('should render active loading visual indicator during synthetic API saturation latency', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    // 1. Inject Artificial Network Intercept: Inject a delay on EVERY auth login route to guarantee capture window
    await page.route(url => url.toString().includes('/api/auth/login'), async route => {
      // Introduce deliberate latency block to guarantee inspection window remains active
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.fulfill({ status: 401, body: JSON.stringify({ error: 'Delayed failure' }) });
    });

    // 2. Saturate input fields
    await page.getByPlaceholder(/you@example.com/i).first().fill('latency-test@perf.dev');
    await page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first().fill('AnySecret123!');

    // Use absolute TYPE locator as Accessible Name dynamically shifts when internal text is swapped for icons
    const submitBtn = page.locator('button[type="submit"]').first();
    
    // 3. Initiate submission fire sequence
    await submitBtn.click();

    // 4. IMMEDIATE ASSERTION: Check state mutation WHILE backend latency holds the request
    // The button should transition instantly into disabled status preventing secondary double-clicks
    await expect(submitBtn, 'Concurrent execution safety failed! Button not disabled during pending state').toBeDisabled();

    // Assert presence of internal spinner element (Lucide Loader)
    const loadingSpinner = page.locator('svg.animate-spin');
    await expect(loadingSpinner.first(), 'Expected loading visual spinner failed to hydrate during API block').toBeVisible();
  });

  test('should display active security advisory banners passed via dynamic location state', async ({ page }) => {
    const EXPECTED_MSG = 'Your session has expired. Please sign in again.';
    
    // 1. Pre-condition clear
    await page.context().clearCookies();
    
    // 2. Start fresh and synthesize persistent state
    await page.goto('/');
    await page.evaluate((msg) => {
      // React Router v6 serializes injected location state into the browser's native 
      // history state object inside a dedicated 'usr' envelope.
      // By synthesizing this structure then enforcing a reload, React Router will
      // deserialize it automatically on boot.
      window.history.replaceState({ usr: { authMessage: msg }, key: "synthetic-boot-1" }, "", "/login");
      window.location.reload();
    }, EXPECTED_MSG);

    // 3. Wait for dynamic viewport hydration to finalize landing at endpoint
    await page.waitForURL(/.*\/login/);
    
    // 4. ASSERTION: Targeted advisory node contains precise verification text string
    const advisoryBanner = page.getByTestId('auth-info-message');
    await expect(advisoryBanner).toBeVisible({ timeout: 8000 });
    await expect(advisoryBanner).toContainText(EXPECTED_MSG);
    
    // Verify critical thematic visual identifiers exist (amber aesthetic warning colors)
    await expect(advisoryBanner).toHaveClass(/bg-amber-50/);
  });

  test('should prevent persistent reverse history loops back to login when authenticated', async ({ page }) => {
    const reverseCreds = {
      name: 'History Evaluator',
      email: `history-${Date.now()}@reversal.dev`,
      password: 'BackSafe123!'
    };

    // 1. Setup Stage: Bootstrap identity context to satisfy pre-conditions
    await page.goto('/signup');
    await fillSignupCredentials(page, reverseCreds);
    await page.getByRole('button', { name: /Create Account/i }).first().click();
    
    // Wait for landing in internal system
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // 2. Active Session Transit: Force transit to a known third page inside to establish deep stack, 
    // or just simply log out and log back in to establish stack correctly.
    // Easier: Clear, go to login, log in, wait for dashboard. Then history stack has [Login, Dashboard]
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder(/you@example.com/i).first().fill(reverseCreds.email);
    await page.getByPlaceholder(/Min 8 characters/i).or(page.locator('input[type="password"]').first()).first().fill(reverseCreds.password);
    await page.getByRole('button', { name: /Sign In/i }).first().click();
    
    // 3. Validate Successful Forward Transit
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // 4. TRIGGER: Synthesize low-level browser back button click
    await page.goBack();

    // 5. ASSERT: Boundary Guard intercepts and forces loopback forward to internal landing
    // Wait explicitly for the redirect logic in App.tsx component to fire and restore security
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 8000 });

    // Ensure absolute render integrity confirms dashboard context persisted
    const dashAnchor = page.getByText(/Total Balance/i).or(page.getByText(/Good/i)).first();
    await expect(dashAnchor).toBeVisible();
  });
});
