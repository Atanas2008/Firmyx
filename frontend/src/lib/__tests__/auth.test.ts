import { setTokens, getAccessToken, getRefreshToken, clearTokens, isAuthenticated, getCurrentUser } from '../auth';

// Helper: create a fake JWT with given payload
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe('auth helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves tokens', () => {
    setTokens('access-123', 'refresh-456');
    expect(getAccessToken()).toBe('access-123');
    expect(getRefreshToken()).toBe('refresh-456');
  });

  it('clears tokens', () => {
    setTokens('a', 'r');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('isAuthenticated returns false with no token', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true with valid token', () => {
    const token = fakeJwt({ sub: '123', exp: Math.floor(Date.now() / 1000) + 3600 });
    setTokens(token, 'refresh');
    expect(isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false with expired token', () => {
    const token = fakeJwt({ sub: '123', exp: Math.floor(Date.now() / 1000) - 100 });
    setTokens(token, 'refresh');
    expect(isAuthenticated()).toBe(false);
  });

  it('getCurrentUser extracts user from JWT', () => {
    const token = fakeJwt({
      sub: 'user-id-1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'owner',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    setTokens(token, 'refresh');
    const user = getCurrentUser();
    expect(user).toEqual({
      id: 'user-id-1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'owner',
    });
  });

  it('getCurrentUser returns null with no token', () => {
    expect(getCurrentUser()).toBeNull();
  });
});
