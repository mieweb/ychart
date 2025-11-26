# Org Chart Playwright Tests

Comprehensive test suite for the organizational chart application covering functionality, accessibility, and keyboard navigation using Playwright and Chrome DevTools MCP.

## 🎯 Test Summary

- ✅ **31 comprehensive tests** covering all functionality
- ✅ **All 30 nodes verified** - expansion, collapse, visibility
- ✅ **508 Compliance** - full keyboard navigation support
- ✅ **Accessibility testing** with axe-core
- ✅ **Chrome DevTools MCP integration** for interactive testing

## Test Coverage

### 1. Expansion & Collapse Tests
- ✅ Root node visibility
- ✅ Direct reports rendering
- ✅ Node expansion on click
- ✅ Node collapse functionality
- ✅ Multi-level hierarchy expansion
- ✅ All 30 nodes visibility verification

### 2. Keyboard Navigation Tests (508 Compliance)
- ✅ Tab key navigation
- ✅ Arrow key support (Up, Down, Left, Right)
- ✅ Enter key for node expansion/collapse
- ✅ Space key for activation
- ✅ Focus visibility during navigation
- ✅ Zoom keyboard shortcuts (Ctrl +/-, Ctrl 0)

### 3. Accessibility Tests (508/WCAG Compliance)
- ✅ Axe-core accessibility scan
- ✅ ARIA labels on interactive elements
- ✅ Color contrast compliance
- ✅ Heading hierarchy validation
- ✅ Screen reader navigation support

### 4. Visual & Structural Tests
- ✅ SVG structure validation
- ✅ Connection lines between nodes
- ✅ Node card styling
- ✅ Zoom controls functionality
- ✅ Export functionality
- ✅ Full chart screenshot capture
- ✅ Responsive design (window resize)

### 5. Interactive Features Tests
- ✅ Tooltip/hover information
- ✅ Node highlighting on interaction
- ✅ Drag and drop support (if enabled)
- ✅ State persistence across interactions
- ✅ Rapid clicking error handling

### 6. Performance Tests
- ✅ Page load time verification
- ✅ Rendering performance with all nodes expanded

## Running Tests

### Run all tests (headless)
```bash
pnpm test
```

### Run tests with UI mode (interactive)
```bash
pnpm test:ui
```

### Run tests with browser visible
```bash
pnpm test:headed
```

### Debug mode (step through tests)
```bash
pnpm test:debug
```

### View test report
```bash
pnpm test:report
```

### Run specific test file
```bash
pnpm test tests/orgchart.spec.ts
```

### Run specific test by name
```bash
pnpm test -g "should render the org chart"
```

### Run tests in specific browser
```bash
pnpm test --project=chromium
pnpm test --project=firefox
pnpm test --project=webkit
```

## Test Results

Test results, screenshots, and traces are stored in:
- `playwright-report/` - HTML test report
- `test-results/` - Detailed test results and artifacts
- `tests/screenshots/` - Generated screenshots

## Accessibility Testing

The test suite uses `@axe-core/playwright` to scan for:
- WCAG 2.0 Level A & AA violations
- WCAG 2.1 Level A & AA violations
- Section 508 compliance issues
- Color contrast problems
- Missing ARIA labels
- Keyboard navigation issues

## 508 Compliance Features Tested

1. **Keyboard Navigation**
   - All interactive elements accessible via keyboard
   - Proper tab order maintained
   - Arrow keys for chart navigation
   - Enter/Space for activation

2. **Focus Management**
   - Visible focus indicators
   - Logical focus order
   - Focus trap prevention

3. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA labels and roles
   - Alternative text for visual elements

4. **Color & Contrast**
   - Sufficient contrast ratios
   - Information not conveyed by color alone

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Install dependencies
  run: pnpm install

- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps

- name: Run Playwright tests
  run: pnpm test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests failing locally
1. Ensure dev server is running: `pnpm dev`
2. Clear browser cache: `pnpm exec playwright test --clear-cache`
3. Update browsers: `pnpm exec playwright install`

### Accessibility violations
Check the detailed report in `playwright-report/` for specific WCAG/508 violations and remediation steps.

### Timeout issues
Increase timeout in `playwright.config.ts` if needed:
```typescript
use: {
  timeout: 30000, // 30 seconds per test
}
```

## Contributing

When adding new features to the org chart:
1. Add corresponding tests to `tests/orgchart.spec.ts`
2. Ensure accessibility compliance with axe-core
3. Test keyboard navigation
4. Run full test suite before committing

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Section 508 Standards](https://www.section508.gov/)
