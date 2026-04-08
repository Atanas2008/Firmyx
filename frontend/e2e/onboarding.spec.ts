import { test, expect } from '@playwright/test';

test.describe('Onboarding flow', () => {
  const email = `e2e-onboard-${Date.now()}@test.com`;
  const password = 'TestPass123';

  test.beforeAll(async ({ request }) => {
    // Register via API directly
    await request.post('http://localhost:8000/api/auth/register', {
      data: { email, password, full_name: 'Onboard User' },
    });
  });

  test('full onboarding: create business → redirected to financials', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Empty dashboard should show getting started
    await expect(page.getByText(/getting started|welcome/i)).toBeVisible();

    // Click add business
    await page.getByRole('link', { name: /add.*business/i }).first().click();
    await expect(page).toHaveURL(/\/businesses\/new/);

    // Fill business form
    await page.getByLabel(/business name/i).fill('E2E Corp');
    await page.getByLabel(/industry/i).selectOption({ index: 1 });

    // Submit
    await page.getByRole('button', { name: /create/i }).click();

    // Should redirect to financials page (UX fix)
    await expect(page).toHaveURL(/\/financials/, { timeout: 5000 });
  });

  test('add financial record and run analysis', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to first business
    await page.getByRole('link', { name: /E2E Corp/i }).click();

    // Go to financials
    await page.getByRole('link', { name: /financials/i }).click();

    // Fill financial form (find Revenue input and fill it)
    const revenueInput = page.getByLabel(/revenue/i).first();
    await revenueInput.click();
    await revenueInput.fill('50000');

    const expensesInput = page.getByLabel(/expenses/i).first();
    await expensesInput.click();
    await expensesInput.fill('35000');

    const cashInput = page.getByLabel(/cash/i).first();
    await cashInput.click();
    await cashInput.fill('100000');

    // Submit
    await page.getByRole('button', { name: /save|submit/i }).click();

    // Success message
    await expect(page.getByText(/saved|success/i)).toBeVisible({ timeout: 5000 });

    // Navigate to analysis
    await page.getByRole('link', { name: /analysis/i }).click();

    // Run analysis
    await page.getByRole('button', { name: /run.*latest/i }).click();

    // Should see risk score
    await expect(page.getByText(/risk score|your score/i).first()).toBeVisible({ timeout: 10000 });
  });
});
