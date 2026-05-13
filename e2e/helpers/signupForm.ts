import type { Page } from '@playwright/test';

export async function fillSignupCredentials(
  page: Page,
  identity: { name: string; email: string; password: string },
): Promise<void> {
  await page.getByPlaceholder(/Yugandhar Reddy/i).or(page.locator('input').first()).first().fill(identity.name);
  await page.getByPlaceholder(/you@example.com/i).first().fill(identity.email);
  await page.getByPlaceholder(/Min 8 characters/i).first().fill(identity.password);
  await page.getByPlaceholder(/Confirm your password/i).first().fill(identity.password);
}
