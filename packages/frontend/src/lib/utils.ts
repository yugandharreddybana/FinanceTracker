import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Safe localStorage wrapper — incognito mode and storage quota errors are silent.
export const safeStorage = {
  get(key: string): string | null {
    try { return typeof window === 'undefined' ? null : window.localStorage.getItem(key); }
    catch { return null; }
  },
  set(key: string, value: string): boolean {
    try { window.localStorage.setItem(key, value); return true; }
    catch { return false; }
  },
  remove(key: string): void {
    try { window.localStorage.removeItem(key); } catch { /* noop */ }
  },
};

// JWT expiry check — returns true if token is missing or expired.
export function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const [, payload] = token.split('.');
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!decoded.exp) return false;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}
