import { describe, it, expect } from 'vitest';
import { createToken, verifyToken } from '../lib/auth.js';

describe('JWT Auth', () => {
  const payload = { uid: 'test-uid', email: 'test@example.com', name: 'Test User' };

  it('creates and verifies a valid token', () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long-for-testing';
    const token = createToken(payload);
    expect(token).toBeTruthy();
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.uid).toBe(payload.uid);
    expect(decoded?.email).toBe(payload.email);
  });

  it('returns null for a tampered token', () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long-for-testing';
    const token = createToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(verifyToken(tampered)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(verifyToken('')).toBeNull();
  });
});
