import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('landing page loads and has CTA buttons', async ({ page }) => {
    await page.goto('/');

    // Entry screen visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // CTA buttons
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible();
  });

  test('demo page loads', async ({ page }) => {
    await page.goto('/demo');
    await expect(page).toHaveURL(/\/demo/);
  });
});
