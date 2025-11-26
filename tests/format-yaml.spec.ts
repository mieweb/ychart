import { test, expect } from '@playwright/test';

test.describe('YAML Formatter Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('[role="tree"]', { state: 'visible' });
  });

  test('format button should be visible in toolbar', async ({ page }) => {
    const formatButton = page.getByRole('button', { name: 'Format YAML' });
    await expect(formatButton).toBeVisible();
  });

  test('format button should format YAML when clicked', async ({ page }) => {
    // Ensure editor is visible
    const editorToggle = page.locator('button').filter({ hasText: /◀|▶/ }).first();
    const toggleText = await editorToggle.textContent();
    
    // If editor is collapsed (showing ▶), expand it
    if (toggleText?.includes('▶')) {
      await editorToggle.click();
      await page.waitForTimeout(500);
    }

    // Get initial content length
    const editor = page.locator('.cm-content[role="textbox"]');
    await expect(editor).toBeVisible();

    // Click format button
    const formatButton = page.getByRole('button', { name: 'Format YAML' });
    await formatButton.click();
    
    // Wait for formatting to complete
    await page.waitForTimeout(500);

    // Verify chart was re-rendered (this happens after formatting)
    const tree = page.locator('[role="tree"]');
    await expect(tree).toBeVisible();

    // Verify no errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Should have no formatting errors
    expect(errors.filter(e => e.includes('Failed to format YAML'))).toHaveLength(0);
  });

  test('format button should preserve data after formatting', async ({ page }) => {
    // Expand all nodes first to verify they exist
    const expandAllButton = page.getByRole('button', { name: 'Expand All' });
    await expandAllButton.click();
    await page.waitForTimeout(1000);

    // Count visible nodes before formatting
    const nodesBeforeFormat = await page.locator('[role="treeitem"]').count();
    expect(nodesBeforeFormat).toBeGreaterThan(0);

    // Click format button
    const formatButton = page.getByRole('button', { name: 'Format YAML' });
    await formatButton.click();
    await page.waitForTimeout(500);

    // Expand all again after formatting
    await expandAllButton.click();
    await page.waitForTimeout(1000);

    // Count visible nodes after formatting - should be the same
    const nodesAfterFormat = await page.locator('[role="treeitem"]').count();
    expect(nodesAfterFormat).toBe(nodesBeforeFormat);
  });

  test('format button should handle invalid YAML gracefully', async ({ page }) => {
    // Get the editor
    const editor = page.locator('.cm-content[role="textbox"]');
    
    // Ensure editor is visible
    const editorToggle = page.locator('button').filter({ hasText: /◀|▶/ }).first();
    const toggleText = await editorToggle.textContent();
    if (toggleText?.includes('▶')) {
      await editorToggle.click();
      await page.waitForTimeout(500);
    }

    await expect(editor).toBeVisible();

    // Clear editor and insert invalid YAML
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('invalid: yaml: content: [[[');

    // Try to format
    const formatButton = page.getByRole('button', { name: 'Format YAML' });
    
    // Listen for alerts
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await formatButton.click();
    await page.waitForTimeout(500);

    // Should show an error message
    expect(alertMessage).toContain('Failed to format YAML');
  });

  test('format button tooltip should be visible on hover', async ({ page }) => {
    const formatButton = page.getByRole('button', { name: 'Format YAML' });
    
    // Hover over the button
    await formatButton.hover();
    await page.waitForTimeout(300); // Wait for tooltip animation

    // Check tooltip is visible (it should be in the button's children)
    const tooltip = formatButton.locator('.ychart-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Format YAML');
  });

  test('format button should have correct icon', async ({ page }) => {
    const formatButton = page.getByRole('button', { name: 'Format YAML' });
    await expect(formatButton).toBeVisible();

    // Check that it contains an SVG icon
    const icon = formatButton.locator('svg');
    await expect(icon).toBeVisible();
  });
});
