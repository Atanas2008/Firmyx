import { test, expect } from '@playwright/test';

// These tests require a running backend (docker-compose up)
// They run in the E2E CI job, not during unit tests

test.describe('Authentication', () => {
  const testEmail = `e2e-${Date.now()}@test.com`;
  const testPassword = 'TestPass123';

  test('register flow', async ({ page }) => {
    await page.goto('/register');

    // Page loads
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();

    // Fill form
    await page.getByLabel(/full name/i).fill('E2E Test User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill(testPassword);
    await page.getByLabel(/confirm/i).fill(testPassword);

    // Submit
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show success and redirect
    await expect(page.getByText(/account created/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('login flow', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill('WrongPassword1');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 3000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected to login', async ({ page }) => {
    // Clear any tokens
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
