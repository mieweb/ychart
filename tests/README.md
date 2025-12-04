# YChart Editor - Test Suite

## Overview

This directory contains Playwright end-to-end tests for the YChart Editor application.

## Test Files

### `smoke.spec.ts`
Quick smoke test to verify basic application loading.
- **Tests**: 1 test × 2 browsers = 2 test runs
- **Purpose**: Fast CI/CD pipeline check

### `ychart-essential-v2.spec.ts`  
Essential functionality tests covering core features that MUST work.
- **Tests**: 17 tests × 2 browsers = 34 test runs
- **Coverage**:
  - Page Load (3 tests): App loads, SVG renders, toolbar visible
  - Toolbar Buttons (5 tests): All 5 toolbar buttons exist and are enabled
  - Button Interactions (4 tests): Clicking toolbar buttons doesn't cause errors
  - Editor Sidebar (2 tests): Editor elements exist in DOM
  - Basic Chart Rendering (2 tests): SVG renders with proper dimensions, chart has elements
  - Accessibility Basics (1 test): Main heading present

**Total**: 18 tests × 2 browsers = **36 test runs, 100% passing**

## Running Tests

```bash
# Run all tests
pnpm exec playwright test

# Run with UI
pnpm exec playwright test --ui

# Run specific file
pnpm exec playwright test tests/smoke.spec.ts

# Run with reporter
pnpm exec playwright test --reporter=list
```

## Test Architecture

### Selector Strategy
All YChart elements use unique instance IDs, so tests use attribute selectors with partial matching:

```typescript
// Chart container
'[data-id^="ychart-chart-"]'

// Toolbar
'[data-id^="ychart-toolbar-"]'

// Toolbar buttons
'[data-id^="ychart-btn-expandAll-"]'
'[data-id^="ychart-btn-collapseAll-"]'
'[data-id^="ychart-btn-fit-"]'
'[data-id^="ychart-btn-reset-"]'
'[data-id^="ychart-btn-export-"]'

// Editor sidebar
'[data-id^="ychart-editor-sidebar-"]'
```

### Browser Support
Tests run on:
- ✅ Chromium
- ✅ WebKit (Safari)
- ❌ Firefox (disabled due to timeout issues)

### Wait Strategy
- Wait for `[data-id^="ychart-chart-"]` container (10s timeout)
- Add 500ms buffer after navigation
- Add small waits after button clicks (300-500ms)

## Test Philosophy

Based on project requirements (see `.github/copilot-instructions.md`):

1. **KISS**: Keep tests simple and focused on essential functionality
2. **DRY**: Reuse selectors and patterns
3. **Smallest viable tests**: Test what matters, avoid complex scenarios
4. **100% passing required**: "we need it so that it will be 100% passing any test we are writing"

## What We Don't Test

Following the user's guidance to focus on "essential and base functionality":
- ❌ Complex node dragging/swapping
- ❌ Export file download verification
- ❌ Real-time YAML editing synchronization  
- ❌ Advanced keyboard navigation
- ❌ Force graph view (experimental feature)
- ❌ Column adjustment mode
- ❌ Swap mode interactions

## Debugging

If tests fail:
1. Check screenshots in `test-results/` directory
2. Run with `--debug` flag: `pnpm exec playwright test --debug`
3. Check that dev server is running on localhost:5173
4. Verify button selectors match current code in `src/ychartEditor.ts`

## Configuration

See `playwright.config.ts` for:
- Test directory: `./tests`
- Base URL: `http://localhost:5173`
- Timeout: 120 seconds
- Auto-start dev server with `pnpm dev`
- HTML reporter output
- Screenshot on failure

## Continuous Integration

For CI/CD:
1. Run `pnpm exec playwright install --with-deps` to install browsers
2. Run `pnpm exec playwright test` for headless execution
3. Check exit code (0 = all pass, 1 = failures)
4. View HTML report: `pnpm exec playwright show-report`

## Test Artifacts

Test artifacts are gitignored:
- `playwright-report/` - HTML test reports
- `test-results/` - Screenshots and traces

These are excluded via `.gitignore` to keep the repository clean.
