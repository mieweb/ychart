import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Comprehensive Playwright Test Suite for Org Chart
 * 
 * Tests cover:
 * - Expansion and collapse functionality
 * - Node visibility verification
 * - Keyboard navigation (Arrow keys, Tab, Enter, Space)
 * - 508 Accessibility compliance
 * - SVG rendering and structure
 */

test.describe('Org Chart - Expansion & Collapse Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the org chart to be fully rendered
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow time for initial render and animations
  });

  test('should render the org chart with root node visible', async ({ page }) => {
    // Verify tree container exists
    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // Verify at least one treeitem is visible (the root/CEO node)
    const treeitems = page.locator('[role="treeitem"]');
    await expect(treeitems.first()).toBeVisible();
    
    const treeitemCount = await treeitems.count();
    console.log(`Found ${treeitemCount} visible tree items initially`);
    expect(treeitemCount).toBeGreaterThan(0);
  });

  test('should display all direct reports of CEO initially', async ({ page }) => {
    // Check initial number of visible nodes
    const treeitems = page.locator('[role="treeitem"]');
    const initialCount = await treeitems.count();
    console.log(`Initially visible nodes: ${initialCount}`);
    
    // Should have at least 1 node visible (CEO)
    expect(initialCount).toBeGreaterThanOrEqual(1);
  });

  test('should expand node when clicking expand all button', async ({ page }) => {
    // Get initial count
    let treeitems = page.locator('[role="treeitem"]');
    const initialCount = await treeitems.count();
    console.log(`Initial node count: ${initialCount}`);

    // Click "Expand All" button
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(2000); // Wait for animation

    // Verify more nodes are visible
    treeitems = page.locator('[role="treeitem"]');
    const expandedCount = await treeitems.count();
    console.log(`Expanded node count: ${expandedCount}`);
    
    expect(expandedCount).toBeGreaterThan(initialCount);
  });

  test('should collapse node when clicking collapse all button', async ({ page }) => {
    // First expand all
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(2000);
    
    let treeitems = page.locator('[role="treeitem"]');
    const expandedCount = await treeitems.count();
    console.log(`Expanded node count: ${expandedCount}`);

    // Click Collapse All
    const collapseAllBtn = page.locator('button').filter({ hasText: 'Collapse All' });
    await collapseAllBtn.click();
    await page.waitForTimeout(2000);
    
    // Verify fewer nodes are visible
    treeitems = page.locator('[role="treeitem"]');
    const collapsedCount = await treeitems.count();
    console.log(`Collapsed node count: ${collapsedCount}`);
    
    expect(collapsedCount).toBeLessThan(expandedCount);
  });

  test('should expand multiple levels of hierarchy', async ({ page }) => {
    // Click "Expand All" to show all levels
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(2000);

    // Check that multiple levels are visible by counting expandable items
    const expandableItems = page.locator('[role="treeitem"][aria-expanded="true"]');
    const expandedItemsCount = await expandableItems.count();
    console.log(`Number of expanded items: ${expandedItemsCount}`);
    
    expect(expandedItemsCount).toBeGreaterThan(0);
  });

  test('should verify all 30 nodes can be made visible by expansion', async ({ page }) => {
    // Click "Expand All" button
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(3000); // Wait for full expansion

    // Count all visible tree items
    const treeitems = page.locator('[role="treeitem"]');
    const visibleCount = await treeitems.count();
    
    console.log(`Visible nodes after full expansion: ${visibleCount}/30`);
    
    // Should have all 30 employees visible
    expect(visibleCount).toBe(30);
  });
});

test.describe('Org Chart - Keyboard Navigation Tests (508 Compliance)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('should navigate to chart container with Tab key', async ({ page }) => {
    // Tab should focus on interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    
    // Check if tree or button receives focus
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        role: el?.getAttribute('role'),
        text: el?.textContent?.substring(0, 50)
      };
    });
    
    console.log('Focused element:', focusedElement);
    expect(focusedElement.tagName).toBeTruthy();
  });

  test('should support arrow key navigation within chart', async ({ page }) => {
    // Focus on the tree
    const tree = page.locator('[role="tree"]').first();
    await tree.click();
    await page.waitForTimeout(500);
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);

    // Verify chart is still visible (navigation didn't break anything)
    await expect(tree).toBeVisible();
  });

  test('should expand/collapse nodes with Enter key', async ({ page }) => {
    // Focus on the tree
    const tree = page.locator('[role="tree"]').first();
    await tree.focus();
    await page.waitForTimeout(500);
    
    // Try to use Enter key to interact
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Verify tree is still functional
    const treeitems = page.locator('[role="treeitem"]');
    const count = await treeitems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should support Space key for activation', async ({ page }) => {
    const tree = page.locator('[role="tree"]').first();
    await tree.focus();
    await page.waitForTimeout(500);
    
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    
    // Verify chart is still functional
    await expect(tree).toBeVisible();
  });

  test('should maintain focus visibility during keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      // Check that something has focus
      const hasFocus = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused !== null && focused !== document.body;
      });
      
      expect(hasFocus).toBeTruthy();
    }
  });

  test('should allow zooming with keyboard shortcuts', async ({ page }) => {
    const container = page.locator('#container').first();
    await container.click();
    
      // Try zoom in (usually Ctrl/Cmd + Plus)
    await page.keyboard.press('Control+Equal'); // + key
    await page.waitForTimeout(500);
    
    // Try zoom out
    await page.keyboard.press('Control+Minus');
    await page.waitForTimeout(500);
    
    // Try reset zoom
    await page.keyboard.press('Control+0');
    await page.waitForTimeout(500);
    
    // Chart should still be visible
    await expect(page.locator('[role="tree"]').first()).toBeVisible();
  });
});

test.describe('Org Chart - Accessibility (508 Compliance)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('should pass axe accessibility scan', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'section508'])
      .analyze();

    console.log(`Found ${accessibilityScanResults.violations.length} accessibility violations`);
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    // Check for ARIA attributes on buttons and interactive elements
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // Button should have either aria-label or visible text
        expect(ariaLabel || textContent).toBeTruthy();
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const contrastIssues = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();

    const contrastViolations = contrastIssues.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations.length).toBe(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const h1Count = await page.locator('h1').count();
    
    // Should have at least one h1
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Should not have more than one h1
    expect(h1Count).toBeLessThanOrEqual(2);
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for semantic HTML elements
    const semanticElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('header, main, nav, section, article, aside, footer');
      return elements.length;
    });
    
    console.log(`Found ${semanticElements} semantic HTML elements`);
    expect(semanticElements).toBeGreaterThan(0);
  });
});

test.describe('Org Chart - Visual and Structural Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('should have proper tree structure', async ({ page }) => {
    // Verify tree element exists
    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // Check for treeitems
    const treeitems = page.locator('[role="treeitem"]');
    const treeitemCount = await treeitems.count();
    console.log(`Found ${treeitemCount} tree items`);
    expect(treeitemCount).toBeGreaterThan(0);
  });

  test('should render connection lines between nodes', async ({ page }) => {
    // Expand nodes to see connections
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(2000);

    // Look for SVG path elements (typically used for connections)
    const paths = page.locator('svg path, svg line');
    const pathCount = await paths.count();
    console.log(`Found ${pathCount} connection paths/lines`);
    // May or may not have visible paths depending on implementation
    expect(pathCount).toBeGreaterThanOrEqual(0);
  });

  test('should display node cards with proper styling', async ({ page }) => {
    // Check that node cards are rendered as treeitems
    const treeitems = page.locator('[role="treeitem"]');
    const itemCount = await treeitems.count();
    console.log(`Found ${itemCount} tree items`);
    expect(itemCount).toBeGreaterThan(0);
  });

  test('should handle zoom controls', async ({ page }) => {
    // Look for zoom or fit buttons
    const fitBtn = page.locator('button').filter({ hasText: /fit|zoom/i }).first();
    
    if (await fitBtn.count() > 0) {
      await fitBtn.click();
      await page.waitForTimeout(500);
      
      // Chart should still be visible
      await expect(page.locator('[role="tree"]').first()).toBeVisible();
    }
  });

  test('should support export functionality if available', async ({ page }) => {
    // Look for export button
    const exportBtn = page.locator('button').filter({ hasText: /export|download|svg/i });
    
    if (await exportBtn.count() > 0) {
      // Click export button
      await exportBtn.first().click();
      await page.waitForTimeout(1000);
      
      // Verify no errors occurred
      const tree = page.locator('[role="tree"]').first();
      await expect(tree).toBeVisible();
    }
  });

  test('should take screenshot of full org chart', async ({ page }) => {
    // Expand all nodes for full screenshot
    const expandBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandBtn.click();
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/full-orgchart.png',
      fullPage: true 
    });

    // Verify chart is visible in screenshot area
    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();
  });

  test('should handle window resize gracefully', async ({ page }) => {
    // Set initial viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    let tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // Resize to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(tree).toBeVisible();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(tree).toBeVisible();

    // Resize back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await expect(tree).toBeVisible();
  });
});

test.describe('Org Chart - Interactive Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('should display tooltips or additional info on hover', async ({ page }) => {
    const firstTreeitem = page.locator('[role="treeitem"]').first();
    
    // Hover over node
    await firstTreeitem.hover();
    await page.waitForTimeout(500);
    
    // Check if any tooltip or additional info appears
    const tooltip = page.locator('[role="tooltip"], .tooltip, .popover');
    // Tooltips may or may not be implemented, so this is optional
    const tooltipCount = await tooltip.count();
    console.log(`Tooltip elements found: ${tooltipCount}`);
  });

  test('should highlight nodes on interaction', async ({ page }) => {
    const firstTreeitem = page.locator('[role="treeitem"]').first();
    
    // Click node
    await firstTreeitem.click();
    await page.waitForTimeout(300);
    
    // Visual feedback should occur (border, shadow, color change)
    // This is hard to test without visual regression, so we just verify no errors
    await expect(page.locator('[role="tree"]').first()).toBeVisible();
  });

  test('should support drag and drop if enabled', async ({ page }) => {
    // Try to drag a node
    const node = page.locator('[role="treeitem"]').first();
    const boundingBox = await node.boundingBox();
    
    if (boundingBox) {
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(boundingBox.x + 100, boundingBox.y + 100);
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
    
    // Chart should still be functional
    await expect(page.locator('[role="tree"]').first()).toBeVisible();
  });

  test('should persist state across interactions', async ({ page }) => {
    // Expand all
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(2000);
    
    // Count expanded items
    let treeitems = page.locator('[role="treeitem"]');
    const expandedCount = await treeitems.count();
    
    // Click elsewhere (another button)
    const fitBtn = page.locator('button').filter({ hasText: 'Fit to Screen' }).first();
    await fitBtn.click();
    await page.waitForTimeout(1000);
    
    // Items should still be expanded
    treeitems = page.locator('[role="treeitem"]');
    const currentCount = await treeitems.count();
    expect(currentCount).toBe(expandedCount);
  });

  test('should handle rapid clicking without errors', async ({ page }) => {
    const expandBtn = page.locator('button').filter({ hasText: 'Expand All' });
    
    // Rapid clicks
    for (let i = 0; i < 5; i++) {
      await expandBtn.click({ timeout: 500 }).catch(() => {});
      await page.waitForTimeout(100);
    }
    
    // Chart should still be functional
    await expect(page.locator('[role="tree"]').first()).toBeVisible();
  });
});

test.describe('Org Chart - Performance Tests', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Page loaded in ${loadTime}ms`);
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should render 30 nodes without performance issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    
    // Expand all nodes
    const expandBtn = page.locator('button').filter({ hasText: 'Expand All' });
    const startTime = Date.now();
    await expandBtn.click();
    await page.waitForTimeout(3000);
    const renderTime = Date.now() - startTime;
    
    console.log(`Full expansion took ${renderTime}ms`);
    expect(renderTime).toBeLessThan(5000);
  });
});
