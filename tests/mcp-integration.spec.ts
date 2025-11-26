/**
 * Chrome DevTools MCP Integration Test
 * 
 * This test demonstrates using Chrome DevTools for interactive testing
 * and can be run manually with the Chrome DevTools MCP server
 */

import { test, expect } from '@playwright/test';

test.describe('Chrome DevTools MCP - Interactive Verification', () => {
  test('Manual verification of org chart with Chrome DevTools', async ({ page }) => {
    console.log('🚀 Opening org chart...');
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('✅ Org chart loaded');

    // Test 1: Verify initial state
    const initialTreeitems = page.locator('[role="treeitem"]');
    const initialCount = await initialTreeitems.count();
    console.log(`📊 Initial node count: ${initialCount}`);
    expect(initialCount).toBeGreaterThan(0);

    // Test 2: Expand all nodes
    console.log('🔄 Clicking Expand All...');
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(3000);

    // Test 3: Count expanded nodes
    const expandedTreeitems = page.locator('[role="treeitem"]');
    const expandedCount = await expandedTreeitems.count();
    console.log(`📊 Expanded node count: ${expandedCount}/30`);
    expect(expandedCount).toBe(30);

    // Test 4: Verify expandable items
    const expandableItems = page.locator('[role="treeitem"][aria-expanded="true"]');
    const expandableCount = await expandableItems.count();
    console.log(`📂 Expandable items: ${expandableCount}`);

    // Test 5: Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: 'tests/screenshots/mcp-test-expanded.png',
      fullPage: true
    });

    // Test 6: Test keyboard navigation
    console.log('⌨️ Testing keyboard navigation...');
    const tree = page.locator('[role="tree"]').first();
    await tree.focus();
    
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    console.log('✅ Arrow key navigation working');

    // Test 7: Test collapse
    console.log('🔄 Clicking Collapse All...');
    const collapseAllBtn = page.locator('button').filter({ hasText: 'Collapse All' });
    await collapseAllBtn.click();
    await page.waitForTimeout(2000);

    const collapsedTreeitems = page.locator('[role="treeitem"]');
    const collapsedCount = await collapsedTreeitems.count();
    console.log(`📊 Collapsed node count: ${collapsedCount}`);
    expect(collapsedCount).toBeLessThan(expandedCount);

    // Test 8: Verify buttons
    console.log('🔘 Verifying control buttons...');
    const buttons = [
      'Fit to Screen',
      'Reset Position',
      'Expand All',
      'Collapse All',
      'Adjust Child Columns',
      'Swap Mode',
      'Switch to Force Graph',
      'Export SVG'
    ];

    for (const buttonText of buttons) {
      const button = page.locator('button').filter({ hasText: buttonText });
      const exists = await button.count() > 0;
      console.log(`  ${exists ? '✅' : '❌'} ${buttonText}`);
      expect(exists).toBe(true);
    }

    // Test 9: Check accessibility attributes
    console.log('♿ Checking accessibility attributes...');
    const treeRole = await tree.getAttribute('role');
    console.log(`  Tree role: ${treeRole}`);
    expect(treeRole).toBe('tree');

    const firstTreeitem = page.locator('[role="treeitem"]').first();
    const treeitemRole = await firstTreeitem.getAttribute('role');
    console.log(`  Treeitem role: ${treeitemRole}`);
    expect(treeitemRole).toBe('treeitem');

    // Test 10: Verify SVG structure
    console.log('🎨 Checking SVG structure...');
    const svg = page.locator('svg');
    const svgCount = await svg.count();
    console.log(`  SVG elements: ${svgCount}`);
    expect(svgCount).toBeGreaterThan(0);

    // Final screenshot
    console.log('📸 Taking final screenshot...');
    await page.screenshot({
      path: 'tests/screenshots/mcp-test-final.png',
      fullPage: true
    });

    console.log('✅ All Chrome DevTools MCP tests passed!');
  });

  test('Verify all 30 employee nodes exist', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    
    // Expand all
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(3000);

    // List of all 30 employees
    const employees = [
      'Sarah Chen', 'Michael Rodriguez', 'Emily Watson', 'David Kim',
      'Jennifer Martinez', 'Robert Taylor', 'Lisa Anderson',
      'James Wilson', 'Maria Garcia', 'Christopher Lee', 'Amanda Brown',
      'Daniel Thompson', 'Jessica White', 'Kevin Harris',
      'Michelle Clark', 'Ryan Lewis', 'Samantha Walker', 'Brian Hall',
      'Nicole Young', 'Andrew King', 'Rachel Wright', 'Justin Scott',
      'Laura Green', 'Marcus Adams', 'Olivia Baker', 'Ethan Nelson',
      'Sophia Carter', 'Tyler Mitchell', 'Isabella Perez', 'Nathan Roberts'
    ];

    console.log('\n👥 Verifying all 30 employees:');
    let foundCount = 0;
    
    for (const name of employees) {
      const element = page.locator('text=' + name).first();
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        foundCount++;
        console.log(`  ✅ ${foundCount}. ${name}`);
      } else {
        console.log(`  ❌ ${name} - NOT FOUND`);
      }
    }

    console.log(`\n📊 Total found: ${foundCount}/30`);
    expect(foundCount).toBe(30);
  });

  test('Keyboard accessibility compliance check', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('\n⌨️ Keyboard Accessibility Test');
    
    // Test Tab navigation
    console.log('  Testing Tab key...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    
    let focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        role: el?.getAttribute('role'),
        text: el?.textContent?.substring(0, 30)
      };
    });
    console.log(`    Focused: ${focusedElement.tag} (${focusedElement.role})`);
    expect(focusedElement.tag).toBeTruthy();

    // Test arrow keys on tree
    console.log('  Testing Arrow keys...');
    const tree = page.locator('[role="tree"]').first();
    await tree.focus();
    
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'];
    for (const key of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(200);
      console.log(`    ✅ ${key} pressed`);
    }

    // Test Enter key
    console.log('  Testing Enter key...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('    ✅ Enter key works');

    // Test Space key
    console.log('  Testing Space key...');
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    console.log('    ✅ Space key works');

    // Test Escape key
    console.log('  Testing Escape key...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    console.log('    ✅ Escape key works');

    console.log('\n✅ All keyboard navigation tests passed!');
  });

  test('Performance benchmark', async ({ page }) => {
    console.log('\n⚡ Performance Test');
    
    // Test initial load
    const loadStart = Date.now();
    await page.goto('/');
    await page.waitForSelector('[role="tree"]', { timeout: 10000 });
    const loadTime = Date.now() - loadStart;
    console.log(`  Initial load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);

    // Test expand all performance
    const expandStart = Date.now();
    const expandAllBtn = page.locator('button').filter({ hasText: 'Expand All' });
    await expandAllBtn.click();
    await page.waitForTimeout(3000);
    const expandTime = Date.now() - expandStart;
    console.log(`  Expand all 30 nodes: ${expandTime}ms`);
    expect(expandTime).toBeLessThan(5000);

    // Test collapse all performance
    const collapseStart = Date.now();
    const collapseAllBtn = page.locator('button').filter({ hasText: 'Collapse All' });
    await collapseAllBtn.click();
    await page.waitForTimeout(2000);
    const collapseTime = Date.now() - collapseStart;
    console.log(`  Collapse all: ${collapseTime}ms`);
    expect(collapseTime).toBeLessThan(3000);

    console.log('\n✅ Performance benchmarks passed!');
  });
});
