# YChart - Copilot Instructions

## Project Overview

YChart is an interactive organizational chart editor built with TypeScript, D3.js, and the d3-org-chart library. It provides a YAML-based data editor with real-time chart visualization, supporting both hierarchical org charts and force-directed graph layouts.

## Technology Stack

- **Language**: TypeScript (strict mode enabled)
- **Build Tool**: Vite (IIFE library build)
- **Core Libraries**:
  - `d3-org-chart` - Org chart visualization (custom fork in `src/d3-org-chart.js`)
  - `d3` - Data visualization and force simulation
  - `CodeMirror 6` - YAML editor with syntax highlighting
  - `js-yaml` - YAML parsing with front matter support
- **Target**: ES2015, browser environment

## Architecture

### Main Components

1. **`YChartEditor`** (`src/ychartEditor.ts`) - Main class exposing a builder/fluent API:
   - Manages layout (chart container, editor sidebar, details panel, toolbar)
   - Handles YAML parsing with front matter (options, schema, card templates)
   - Coordinates between org chart and force graph views
   - Provides programmatic control methods (`.template()`, `.bgPatternStyle()`, etc.)

2. **`OrgChart`** (`src/d3-org-chart.js`) - Custom fork of d3-org-chart:
   - Hierarchical tree layout with expand/collapse
   - Node swapping, keyboard navigation, accessibility (ARIA)
   - Safari compatibility with HTML overlay workaround
   - Dynamic column layout for child nodes

3. **`ForceGraph`** (`src/forceGraph.ts`) - Alternative force-directed visualization:
   - D3 force simulation with drag support
   - Zoom/pan navigation
   - Node click handling

### Data Flow

```
YAML (with front matter) → js-yaml parsing → Data + Options + Schema → OrgChart/ForceGraph → SVG render
```

## Coding Conventions

### TypeScript

- Use strict TypeScript with all linting rules enabled
- Prefer interfaces over type aliases for object shapes
- Use explicit return types on public methods
- Document public API methods with JSDoc comments
- Use `any` sparingly (legacy d3-org-chart interop is acceptable)

```typescript
// Good: Explicit interface
interface YChartOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  editorTheme?: 'light' | 'dark';
}

// Good: Builder pattern with `this` return
initView(containerIdOrElement: string | HTMLElement, yamlData: string): this {
  // ...
  return this;
}
```

### Naming Conventions

- **Classes**: PascalCase (`YChartEditor`, `ForceGraph`)
- **Methods/Functions**: camelCase (`renderChart`, `parseFrontMatter`)
- **Private members**: camelCase with no prefix (`this.orgChart`, `this.currentView`)
- **Constants**: camelCase for local, UPPER_SNAKE_CASE for module-level
- **CSS classes**: kebab-case (`node-details-content`, `html-overlay-container`)

### CSS Patterns

- Use inline styles for dynamic/programmatic styling
- Use CSS file for static base styles
- Support Safari-specific workarounds via `@supports (-webkit-touch-callout: none)`
- Use CSS variables for theming when possible

### Builder/Fluent API Pattern

The project uses a fluent API pattern for configuration:

```typescript
new YChartEditor({ nodeWidth: 220 })
  .initView('container', yamlData)
  .bgPatternStyle('dotted')
  .actionBtnPos('bottomleft', 'horizontal')
  .template((d, schema) => `<div>...</div>`);
```

When adding new configuration options:
1. Add to `YChartOptions` interface
2. Add default in constructor
3. Create a fluent method that returns `this`
4. Document with JSDoc

## Key Patterns to Follow

### SVG Manipulation

Always use D3 selection patterns for SVG manipulation:

```typescript
const svg = d3.select(this.container)
  .append('svg')
  .attr('width', width)
  .attr('height', height);
```

### Event Handling

Use proper cleanup patterns for D3 events:

```typescript
// Attach events
node.on('click', (event, d) => this.handleClick(d));

// In cleanup/destroy
this.simulation?.stop();
```

### DOM Creation

For HTML elements created in JavaScript, use inline styles for positioning and dynamic values:

```typescript
const element = document.createElement('div');
element.style.cssText = `
  position: absolute;
  display: flex;
  gap: 8px;
`;
```

### YAML Front Matter

The project supports YAML front matter with three sections:

```yaml
---
options:    # Chart layout options
  nodeWidth: 220
  nodeHeight: 110
schema:     # Data validation schema
  id: number | required
  name: string | required
card:       # Optional card template definition
  - div:
      class: card-wrapper
      children:
        - h1: $name$
---
# Actual data follows
```

## Browser Compatibility

### Safari Workarounds

Safari has issues with SVG `foreignObject`. The project uses an HTML overlay approach:

1. Create an overlay container with `pointer-events: none`
2. Render node content as positioned HTML divs
3. Forward wheel events to SVG for zoom
4. Handle click events separately for node selection

When modifying node rendering, ensure both SVG and overlay paths work.

### Accessibility Requirements

- Use ARIA roles: `role="tree"`, `role="treeitem"`, `aria-selected`, `aria-expanded`
- Support keyboard navigation: Arrow keys, Enter/Space for expand/collapse
- Maintain visible focus indicators
- Ensure text is selectable within cards

## File Structure

```
src/
├── main.ts           # Entry point, demo initialization
├── ychartEditor.ts   # Main YChartEditor class (library export)
├── d3-org-chart.js   # Custom fork of d3-org-chart
├── d3-org-chart.d.ts # TypeScript declarations for org chart
├── forceGraph.ts     # Force-directed graph alternative view
├── style.css         # Base styles
└── orgchart.yaml     # Sample data
```

## Common Tasks

### Adding a New Toolbar Button

1. Add icon SVG to the `icons` object in `createToolbar()`
2. Add button config to `buttons` array with id, icon, tooltip, action
3. Create handler method (e.g., `handleNewFeature()`)
4. Update button state styling if it's a toggle

### Adding a New Configuration Option

1. Add to `YChartOptions` interface
2. Add default value in constructor's `defaultOptions`
3. Pass to `OrgChart` in `renderChart()` if chart-related
4. Create fluent setter method if needed for runtime changes

### Modifying Node Content Rendering

Priority order for templates:
1. `customTemplate` (set via `.template()` method)
2. `cardTemplate` (from YAML front matter `card:` section)
3. Default template (inline in `getNodeContent()`)

### Working with d3-org-chart

The custom fork in `d3-org-chart.js` extends the original library. Key customizations:
- `enableSwapMode()` / `onNodeSwap()` for drag-to-swap
- `onNodeDetailsClick()` for info button handling
- Safari HTML overlay support
- Keyboard navigation and ARIA attributes

When modifying, maintain backward compatibility with the original API.

## Testing

- Test in both Chrome and Safari
- Verify keyboard navigation works
- Test text selection within cards
- Verify zoom/pan works on all surfaces
- Check export functionality (SVG, PNG)

## Build Commands

```bash
pnpm dev          # Development server
pnpm build        # Production build (outputs to dist/)
pnpm dev:https    # Development with HTTPS
pnpm preview      # Preview production build
```

## Dependencies

Keep dependencies minimal. Current core dependencies:
- `d3` ecosystem (d3, d3-org-chart, d3-flextree)
- `codemirror` with YAML language support
- `js-yaml` for parsing

Avoid adding UI frameworks (React, Vue) - this is a vanilla TypeScript library.

## Code Quality Principles

<!-- https://github.com/mieweb/template-mieweb-opensource/blob/main/.github/copilot-instructions.md -->

### 🎯 DRY (Don't Repeat Yourself)
- **Never duplicate code**: If you find yourself copying code, extract it into a reusable function
- **Single source of truth**: Each piece of knowledge should have one authoritative representation
- **Refactor mercilessly**: When you see duplication, eliminate it immediately
- **Shared utilities**: Common patterns should be abstracted into utility functions

### 💋 KISS (Keep It Simple, Stupid)
- **Simple solutions**: Prefer the simplest solution that works
- **Avoid over-engineering**: Don't add complexity for hypothetical future needs
- **Clear naming**: Functions and variables should be self-documenting
- **Small functions**: Break down complex functions into smaller, focused ones
- **Readable code**: Code should be obvious to understand at first glance

### 🧹 Folder Philosophy
- **Clear purpose**: Every folder should have a main thing that anchors its contents.
- **No junk drawers**: Don’t leave loose files without context or explanation.
- **Explain relationships**: If it’s not elegantly obvious how files fit together, add a README or note.
- **Immediate clarity**: Opening a folder should make its organizing principle clear at a glance.

### 🔄 Refactoring Guidelines
- **Continuous improvement**: Refactor as you work, not as a separate task
- **Safe refactoring**: Always run tests before and after refactoring
- **Incremental changes**: Make small, safe changes rather than large rewrites
- **Preserve behavior**: Refactoring should not change external behavior
- **Code reviews**: All refactoring should be reviewed for correctness

### ⚰️ Dead Code Management
- **Immediate removal**: Delete unused code immediately when identified
- **Historical preservation**: Move significant dead code to `.attic/` directory with context
- **Documentation**: Include comments explaining why code was moved to attic
- **Regular cleanup**: Review and clean attic directory periodically
- **No accumulation**: Don't let dead code accumulate in active codebase

## HTML & CSS Guidelines
- **Semantic Naming**: Every `<div>` and other structural element must use a meaningful, semantic class name that clearly indicates its purpose or role within the layout.
- **CSS Simplicity**: Styles should avoid global resets or overrides that affect unrelated components or default browser behavior. Keep changes scoped and minimal.
- **SASS-First Approach**: All styles should be written in SASS (SCSS) whenever possible. Each component should have its own dedicated SASS file to promote modularity and maintainability.

## Accessibility (ARIA Labeling)

### 🎯 Interactive Elements
- **All interactive elements** (buttons, links, forms, dialogs) must include appropriate ARIA roles and labels
- **Use ARIA attributes**: Implement aria-label, aria-labelledby, and aria-describedby to provide clear, descriptive information for screen readers
- **Semantic HTML**: Use semantic HTML wherever possible to enhance accessibility

### 📢 Dynamic Content
- **Announce updates**: Ensure all dynamic content updates (modals, alerts, notifications) are announced to assistive technologies using aria-live regions
- **Maintain tab order**: Maintain logical tab order and keyboard navigation for all features
- **Visible focus**: Provide visible focus indicators for all interactive elements

## Internationalization (I18N)

### 🌍 Text and Language Support
- **Externalize text**: All user-facing text must be externalized for translation
- **Multiple languages**: Support multiple languages, including right-to-left (RTL) languages such as Arabic and Hebrew
- **Language selector**: Provide a language selector for users to choose their preferred language

### 🕐 Localization
- **Format localization**: Ensure date, time, number, and currency formats are localized based on user settings
- **UI compatibility**: Test UI layouts for text expansion and RTL compatibility
- **Unicode support**: Use Unicode throughout to support international character sets

## Documentation Preferences

### Diagrams and Visual Documentation
- **Always use Mermaid diagrams** instead of ASCII art for workflow diagrams, architecture diagrams, and flowcharts
- **Use memorable names** instead of single letters in diagrams (e.g., `Engine`, `Auth`, `Server` instead of `A`, `B`, `C`)
- Use appropriate Mermaid diagram types:
  - `graph TB` or `graph LR` for workflow architectures 
  - `flowchart TD` for process flows
  - `sequenceDiagram` for API interactions
  - `gitgraph` for branch/release strategies
- Include styling with `classDef` for better visual hierarchy
- Add descriptive comments and emojis sparingly for clarity

### Documentation Standards
- Keep documentation DRY (Don't Repeat Yourself) - reference other docs instead of duplicating
- Use clear cross-references between related documentation files
- Update the main architecture document when workflow structure changes

## Working with GitHub Actions Workflows

### Development Philosophy
- **Script-first approach**: All workflows should call scripts that can be run locally
- **Local development parity**: Developers should be able to run the exact same commands locally as CI runs
- **Simple workflows**: GitHub Actions should be thin wrappers around scripts, not contain complex logic
- **Easy debugging**: When CI fails, developers can reproduce the issue locally by running the same script

## Quick Reference

### 🪶 All Changes should be considered for Pull Request Philosophy

* **Smallest viable change**: Always make the smallest change that fully solves the problem.
* **Fewest files first**: Start with the minimal number of files required.
* **No sweeping edits**: Broad refactors or multi-module changes must be split or proposed as new components.
* **Isolated improvements**: If a change grows complex, extract it into a new function, module, or component instead of modifying multiple areas.
* **Direct requests only**: Large refactors or architectural shifts should only occur when explicitly requested.

### Code Quality Checklist
- [ ] **DRY**: No code duplication - extracted reusable functions?
- [ ] **KISS**: Simplest solution that works?
- [ ] **Minimal Changes**: Smallest viable change made for PR?
- [ ] **Naming**: Self-documenting function/variable names?
- [ ] **Size**: Functions small and focused?
- [ ] **Dead Code**: Removed or archived appropriately?
- [ ] **Accessibility**: ARIA labels and semantic HTML implemented?
- [ ] **I18N**: User-facing text externalized for translation?
- [ ] **Lint**: Run linter if appropriate
- [ ] **Test**: Run tests