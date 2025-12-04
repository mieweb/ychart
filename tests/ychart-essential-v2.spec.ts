import { test, expect } from '@playwright/test';

/**
 * YChart Editor - Essential Tests (Version 2)
 * 
 * Core functionality tests that MUST work.
 * All YChart elements use unique instance IDs appended to their data-id attributes.
 * We use attribute selectors with ^= (starts with) to match elements.
 */

test.describe('YChart Editor - Essential Tests V2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for chart container to be created
    await page.waitForSelector('[data-id^="ychart-chart-"]', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test.describe('Page Load', () => {
    test('should load the application', async ({ page }) => {
      await expect(page.locator('header h1')).toBeVisible();
      await expect(page.locator('[data-id^="ychart-chart-"]')).toBeVisible();
    });

    test('should render chart SVG', async ({ page }) => {
      const svg = page.locator('[data-id^="ychart-chart-"] svg').first();
      await expect(svg).toBeVisible();
    });

    test('should have toolbar visible', async ({ page }) => {
      const toolbar = page.locator('[data-id^="ychart-toolbar-"]');
      await expect(toolbar).toBeVisible();
    });
  });

  test.describe('Toolbar Buttons', () => {
    test('should have Expand All button', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-expandAll-"]');
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });

    test('should have Collapse All button', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-collapseAll-"]');
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });

    test('should have Fit button', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-fit-"]');
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });

    test('should have Reset button', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-reset-"]');
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });

    test('should have Export button', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-export-"]');
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });
  });

  test.describe('Button Interactions', () => {
    test('should click Expand All button without errors', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-expandAll-"]');
      await btn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('header h1')).toBeVisible();
    });

    test('should click Collapse All button without errors', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-collapseAll-"]');
      await btn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('header h1')).toBeVisible();
    });

    test('should click Fit button without errors', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-fit-"]');
      await btn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('header h1')).toBeVisible();
    });

    test('should click Reset button without errors', async ({ page }) => {
      const btn = page.locator('[data-id^="ychart-btn-reset-"]');
      await btn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('header h1')).toBeVisible();
    });
  });

  test.describe('Editor Sidebar', () => {
    test('should have editor sidebar element in DOM', async ({ page }) => {
      // Editor sidebar exists but may be collapsed (width: 0)
      const editor = page.locator('[data-id^="ychart-editor-sidebar-"]');
      const count = await editor.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have CodeMirror editor element in DOM', async ({ page }) => {
      // CodeMirror exists but may be hidden when sidebar is collapsed
      const cmEditor = page.locator('.cm-editor');
      const count = await cmEditor.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Basic Chart Rendering', () => {
    test('should render SVG chart with proper dimensions', async ({ page }) => {
      const svg = page.locator('[data-id^="ychart-chart-"] svg').first();
      const box = await svg.boundingBox();
      
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThan(100);
    });

    test('should have chart elements', async ({ page }) => {
      const groups = page.locator('[data-id^="ychart-chart-"] svg g');
      const count = await groups.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility Basics', () => {
    test('should have main heading', async ({ page }) => {
      const heading = page.locator('header h1');
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(/YChart/);
    });
  });
});
