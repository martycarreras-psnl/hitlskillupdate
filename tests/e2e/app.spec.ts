import { test, expect } from '@playwright/test';

test.describe('App — E2E smoke', () => {
  test('renders the app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText(/Document Intake/i)).toBeVisible();
  });

  test('navigates to the Documents screen and shows seeded data', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Documents/i }).click();
    await expect(page.getByText('northwind-invoice-00841.pdf')).toBeVisible();
  });
});

