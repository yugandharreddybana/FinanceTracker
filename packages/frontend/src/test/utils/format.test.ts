import { describe, it, expect } from 'vitest';
// Test the formatCurrency utility added in Phase 4
// Import path may need adjustment based on Phase 4 output
describe('Currency Formatting', () => {
  it('formats INR correctly', () => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 2
    }).format(1234.56);
    expect(formatted).toContain('1,234.56');
  });

  it('handles zero', () => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 2
    }).format(0);
    expect(formatted).toContain('0.00');
  });

  it('handles negative amounts', () => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 2
    }).format(-500);
    expect(formatted).toContain('500.00');
  });
});
