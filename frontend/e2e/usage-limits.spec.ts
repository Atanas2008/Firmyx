import { test, expect } from '@playwright/test';

test.describe('Usage Limit Flow', () => {
  const email = `e2e-limit-${Date.now()}@test.com`;
  const password = 'TestPass123';
  let businessName: string;

  test.beforeAll(async ({ request }) => {
    // Register user
    await request.post('http://localhost:8000/api/auth/register', {
      data: { email, password, full_name: 'Limit Test User' },
    });
  });

  test('setup: create business and financial record', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Create business
    await page.getByRole('link', { name: /add.*business/i }).first().click();
    await expect(page).toHaveURL(/\/businesses\/new/);
    businessName = `Limit Corp ${Date.now()}`;
    await page.getByLabel(/business name/i).fill(businessName);
    await page.getByLabel(/industry/i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page).toHaveURL(/\/financials/, { timeout: 5000 });

    // Add financial record
    const revenueInput = page.getByLabel(/revenue/i).first();
    await revenueInput.click();
    await revenueInput.fill('50000');
    const expensesInput = page.getByLabel(/expenses/i).first();
    await expensesInput.click();
    await expensesInput.fill('35000');
    const cashInput = page.getByLabel(/cash/i).first();
    await cashInput.click();
    await cashInput.fill('100000');
    await page.getByRole('button', { name: /save|submit/i }).click();
    await expect(page.getByText(/saved|success/i)).toBeVisible({ timeout: 5000 });
  });

  test('first analysis succeeds', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to analysis
    await page.getByRole('link', { name: new RegExp(businessName || 'Limit Corp', 'i') }).click();
    await page.getByRole('link', { name: /analysis/i }).click();
    await page.getByRole('button', { name: /run.*latest/i }).click();
    await expect(page.getByText(/risk score|your score/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('second analysis shows limit reached', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.getByRole('link', { name: new RegExp(businessName || 'Limit Corp', 'i') }).click();
    await page.getByRole('link', { name: /analysis/i }).click();
    await page.getByRole('button', { name: /run.*latest/i }).click();

    // Should see limit reached message or modal
    await expect(
      page.getByText(/limit|upgrade|free.*reached|contact/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Security - Unauthenticated Access', () => {
  test('API returns 403 for unauthenticated business list', async ({ request }) => {
    const resp = await request.get('http://localhost:8000/api/businesses');
    expect(resp.status()).toBe(403);
  });

  test('protected pages redirect to login', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('admin pages require authentication', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/admin');
    // Should redirect to login or show access denied
    await expect(page).toHaveURL(/\/login|\/403/, { timeout: 5000 });
  });
});

test.describe('Analysis & Report Flow', () => {
  const email = `e2e-flow-${Date.now()}@test.com`;
  const password = 'TestPass123';

  test.beforeAll(async ({ request }) => {
    await request.post('http://localhost:8000/api/auth/register', {
      data: { email, password, full_name: 'Flow Test User' },
    });
  });

  test('full flow: register → business → record → analysis → forecast', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Create business
    await page.getByRole('link', { name: /add.*business/i }).first().click();
    await page.getByLabel(/business name/i).fill('Flow Corp');
    await page.getByLabel(/industry/i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page).toHaveURL(/\/financials/, { timeout: 5000 });

    // Add record
    const revenueInput = page.getByLabel(/revenue/i).first();
    await revenueInput.click();
    await revenueInput.fill('80000');
    const expensesInput = page.getByLabel(/expenses/i).first();
    await expensesInput.click();
    await expensesInput.fill('50000');
    const cashInput = page.getByLabel(/cash/i).first();
    await cashInput.click();
    await cashInput.fill('200000');
    await page.getByRole('button', { name: /save|submit/i }).click();
    await expect(page.getByText(/saved|success/i)).toBeVisible({ timeout: 5000 });

    // Run analysis
    await page.getByRole('link', { name: /analysis/i }).click();
    await page.getByRole('button', { name: /run.*latest/i }).click();
    await expect(page.getByText(/risk score|your score/i).first()).toBeVisible({ timeout: 10000 });

    // Check forecast tab/section
    const forecastLink = page.getByRole('link', { name: /forecast/i });
    if (await forecastLink.isVisible()) {
      await forecastLink.click();
      await expect(page.getByText(/projection|forecast/i).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
