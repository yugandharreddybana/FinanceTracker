export const DEMO_EMAIL = 'demo@yugifinance.com';

export const SEED_ADMIN_EMAILS = new Set([
  DEMO_EMAIL,
  'yugi@example.com',
  'free@yugifinance.com',
  'pro@yugifinance.com',
  'enterprise@yugifinance.com',
]);

export function isDemoAccount(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === DEMO_EMAIL;
}

export function isSeedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return SEED_ADMIN_EMAILS.has(email.toLowerCase());
}

export type DemoTransactionSource = 'sample' | 'visitor';

export function demoTransactionSource(aiTag?: string | null): DemoTransactionSource | null {
  if (aiTag === 'demo:sample') return 'sample';
  if (aiTag === 'demo:visitor') return 'visitor';
  return null;
}

export function demoTransactionSourceLabel(source: DemoTransactionSource): string {
  return source === 'sample' ? 'Sample' : 'Visitor-added';
}

export const DEMO_VISITOR_TAG = 'demo:visitor';

export function resolveDemoAiTag(email: string | undefined | null, defaultTag: string): string {
  return isDemoAccount(email) ? DEMO_VISITOR_TAG : defaultTag;
}
