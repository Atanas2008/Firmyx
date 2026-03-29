import type { User } from '@/types';

const ACCESS_TOKEN_KEY = 'firmyx_access_token';
const REFRESH_TOKEN_KEY = 'firmyx_refresh_token';

// ─── Storage helpers (SSR-safe) ───────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─── JWT helpers ─────────────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  email?: string;
  full_name?: string;
  role?: 'owner' | 'accountant' | 'viewer';
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getCurrentUser(): User | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email ?? '',
    full_name: payload.full_name ?? '',
    role: payload.role ?? 'viewer',
  };
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const payload = decodeJwt(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    clearTokens();
    return false;
  }
  return true;
}

export function logout(): void {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
