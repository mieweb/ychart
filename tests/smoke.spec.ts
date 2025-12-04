import { test, expect } from '@playwright/test';

/**
 * Smoke test - Quick verification that the application loads
 */
test.describe('YChart Editor - Smoke Test', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the header is visible
    await expect(page.locator('header h1')).toBeVisible();
    
    // Check that the main container exists
    await expect(page.locator('#container')).toBeVisible();
  });
});
