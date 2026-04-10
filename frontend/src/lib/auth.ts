import type { User } from '@/types';
import Cookies from 'js-cookie';

// ─── Auth state ───────────────────────────────────────────────────────────────
// Tokens are stored in httpOnly cookies set by the backend.
// The frontend CANNOT read them — that's the security guarantee.
// We use a non-sensitive indicator cookie `firmyx_logged_in` so that
// Next.js middleware.ts can detect auth state for SSR redirects.

const LOGGED_IN_COOKIE = 'firmyx_logged_in';

export function markLoggedIn(): void {
  if (typeof window === 'undefined') return;
  Cookies.set(LOGGED_IN_COOKIE, '1', { path: '/', sameSite: 'lax' });
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  Cookies.remove(LOGGED_IN_COOKIE, { path: '/' });
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return Cookies.get(LOGGED_IN_COOKIE) === '1';
}

export function logout(): void {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// ─── Kept for legacy call sites ──────────────────────────────────────────────

export function getAccessToken(): string | null {
  return null;
}

export function getRefreshToken(): string | null {
  return null;
}

export function setTokens(_accessToken: string, _refreshToken: string): void {
  // Tokens are set by the backend via Set-Cookie — nothing to do here.
}

export function getCurrentUser(): User | null {
  return null;
}

