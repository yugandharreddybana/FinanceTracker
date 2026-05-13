import { test, expect } from '@playwright/test';
import { fillSignupCredentials } from './helpers/signupForm';

test.describe('Landing Page UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display basic branding and hero headline', async ({ page }) => {
    // Verify Title
    await expect(page).toHaveTitle(/Finance/);

    // Verify Hero Visibility
    const hero = page.getByRole('heading', { name: /Your Money/i });
    await expect(hero).toBeVisible();

    // Verify Header CTA
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible();
  });

  test('should render mandatory footer policy links', async ({ page }) => {
    // Scroll and Check footer existence
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Confirm added fix links
    await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Terms' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Security' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Contact' })).toBeVisible();
  });

  test('clicking primary CTA should navigate to registration', async ({ page }) => {
    // Wait for hero element then trigger interaction
    const startButton = page.locator('section').filter({ hasText: /Your Money/i }).getByRole('link', { name: 'Start Free' });
    await expect(startButton).toBeVisible();
    
    await startButton.click();

    // Assert Navigation occurred
    await expect(page).toHaveURL(/.*signup/);
    
    // Verify that Signup form inputs rendered on landing page destination
    await expect(page.getByPlaceholder(/John Doe/i).or(page.locator('input[type="text"]')).first()).toBeVisible();
  });

  test('clicking header Sign In should navigate to login page', async ({ page }) => {
    // Locate navigation header sign in link
    const signInLink = page.locator('header').getByRole('link', { name: /Sign In/i });
    await expect(signInLink).toBeVisible();
    
    await signInLink.click();

    // Assert route update
    await expect(page).toHaveURL(/.*login/);
    
    // Verify login form detection
    const loginHeading = page.getByRole('heading', { name: /Welcome back/i }).or(page.getByPlaceholder(/you@example.com/i));
    await expect(loginHeading.first()).toBeVisible();
  });

  test('should display the Watch Demo modal when clicking demo button', async ({ page }) => {
    // Trigger the modal open via dynamic state button
    const demoBtn = page.getByRole('button', { name: /Watch Demo/i });
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // Verify standard modal contents and state preservation
    const modalHeader = page.getByRole('heading', { name: /Demo coming soon/i });
    await expect(modalHeader).toBeVisible();
  });

  test('should successfully close the demo modal upon clicking the X button', async ({ page }) => {
    // Setup: Open the modal first
    const demoBtn = page.getByRole('button', { name: /Watch Demo/i });
    await demoBtn.click();
    
    const modalHeader = page.getByRole('heading', { name: /Demo coming soon/i });
    await expect(modalHeader).toBeVisible();
    
    // Locate and click accessible close target injected inside the container
    const closeBtn = page.locator('div[class*="bg-slate-900"]').getByRole('button').first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Assert proper react lifecycle unmounting occurred
    await expect(modalHeader).not.toBeVisible();
  });

  test('should successfully close the demo modal upon clicking the backdrop', async ({ page }) => {
    // Trigger open
    const demoBtn = page.getByRole('button', { name: /Watch Demo/i });
    await demoBtn.click();
    
    const modalHeader = page.getByRole('heading', { name: /Demo coming soon/i });
    await expect(modalHeader).toBeVisible();
    
    // Target the blur wrapper div directly and execute outer boundary click
    const backdrop = page.locator('.backdrop-blur-sm').first();
    await expect(backdrop).toBeVisible();
    await backdrop.click({ position: { x: 5, y: 5 } }); // Click near top edge to avoid container overlaps

    // Confirm successful teardown
    await expect(modalHeader).not.toBeVisible();
  });

  test('should successfully navigate to all sub-routes from footer links', async ({ page }) => {
    const routes = [
      { name: 'Privacy', path: '/privacy', match: /Privacy/i },
      { name: 'Terms', path: '/terms', match: /Terms/i },
      { name: 'Security', path: '/security', match: /Security/i },
      { name: 'Contact', path: '/contact', match: /Contact/i },
    ];

    for (const route of routes) {
      // Pre-navigate to landing page to reset context
      await page.goto('/');
      
      // Scroll and locate footer link
      const footerLink = page.locator('footer').getByRole('link', { name: route.name });
      await expect(footerLink).toBeVisible();
      
      await footerLink.click();
      
      // Verify instantaneous client-side router transition
      await expect(page).toHaveURL(new RegExp(route.path));
      
      // Verify proper variant content populated in target view by checking exclusive back-link node
      await expect(page.getByRole('link', { name: /Back to home/i })).toBeVisible();
    }
  });

  test('authenticated user visiting root should redirect to dashboard', async ({ page }) => {
    // 1. Create an authenticated session by doing a fresh signup
    const randomUser = `test-user-${Date.now()}@e2e.dev`;
    await page.goto('/signup');

    await fillSignupCredentials(page, {
      name: 'E2E Test Runner',
      email: randomUser,
      password: 'SecurePassword123!',
    });

    // Click Submit
    await page.getByRole('button', { name: /Create Account/i }).or(page.getByRole('button', { name: /Sign Up/i })).first().click();
    
    // Wait for system redirection to Dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // 2. Try to visit the landing page manually via URL
    await page.goto('/');
    
    // 3. Assert that security guards catch and immediately push back to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify main internal dashboard component successfully loaded
    const dashboardAnchor = page.getByText(/Total Balance/i).or(page.getByRole('link', { name: /Dashboard/i }).first());
    await expect(dashboardAnchor.first()).toBeVisible();
  });

  test('verify zero runtime console errors on initial load', async ({ page }) => {
    const logs: string[] = [];
    
    // Register event listener before navigation starts
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Ignore common non-catastrophic noise if necessary, but track real issues
        logs.push(msg.text());
      }
    });

    // Hard listen for catastrophic unhandled page errors
    page.on('pageerror', exception => {
      logs.push(`UNHANDLED EXCEPTION: ${exception.message}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Assert zero logged errors collected during viewport hydrate lifecycle
    expect(logs, `Detected unexpected browser console errors: ${logs.join(' | ')}`).toHaveLength(0);
  });

  test('verify landing page layout is responsive on mobile viewport (375px)', async ({ page }) => {
    // Force narrow smartphone form factor viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/');

    // Assert 1: No destructive horizontal scrolling overflow exists on page container
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll, 'Detected undesirable horizontal overflow-x rendering').toBe(false);

    // Assert 2: Critical Hero Headline still populates properly without clipping
    const hero = page.getByRole('heading', { name: /Your Money/i });
    await expect(hero).toBeInViewport();

    // Assert 3: Call to Action stack reordered correctly and remains actionable
    const startBtn = page.getByRole('link', { name: 'Start Free' });
    await expect(startBtn).toBeVisible();

    // Hard-code artifact output for documentation ledger
    await page.screenshot({ path: 'e2e/mobile-viewport-snapshot.png', fullPage: false });
  });
});
