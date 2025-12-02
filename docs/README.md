# YChart Editor Documentation

This documentation covers the YAML editor features including real-time linting, error reporting, flexible data formats, and keyboard navigation.

## Table of Contents

- [Editor Panel](#editor-panel)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Flexible YAML Data Formats](#flexible-yaml-data-formats)
- [YAML Linting & Validation](#yaml-linting--validation)
- [Error Types](#error-types)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

## Editor Panel

The editor panel provides a full-featured YAML editing experience with syntax highlighting and real-time chart updates:

![Editor with no errors](screenshots/editor-no-errors.png)

### Features

- **Syntax highlighting** - YAML-aware highlighting via CodeMirror
- **Real-time updates** - Chart updates as you type
- **Dark theme** - Uses the OneDark theme for comfortable editing
- **Error banner** - Shows validation errors above the editor
- **Collapsible** - Toggle with the collapse button or keyboard shortcut

The editor panel can be toggled using the collapse button or the keyboard shortcut:

![Editor visible with YAML content](screenshots/editor-visible.png)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + \`` | Toggle editor panel and scroll to selected node |

### Toggle Editor & Find Selected Node

Press `Ctrl + \`` (Control + backtick) to:

1. **If editor is closed** - Open the editor and scroll to the currently selected chart node's YAML definition
2. **If editor is open** - Close the editor panel

This is useful when you select a node in the chart and want to quickly edit its properties in the YAML.

## Flexible YAML Data Formats

YChart supports flexible YAML data formats that minimize boilerplate. You can omit `id` and `parentId` fields in many cases, and the parser will intelligently resolve relationships.

### Auto-Generated IDs

Nodes don't require an explicit `id` field. YChart will auto-generate IDs using the following priority:

1. **Email field** (preferred) - If the node has an `email` field, it becomes the ID (lowercased)
2. **Numeric IDs** - If other nodes use numeric IDs, continues the sequence
3. **String IDs** - Otherwise generates a unique string ID

#### Example: Using Email as ID

```yaml
# No explicit id needed - email becomes the ID
- name: Sarah Chen
  email: sarah.chen@company.com
  title: CEO

- name: Michael Rodriguez
  email: michael.rodriguez@company.com
  title: CTO
  parentId: sarah.chen@company.com  # Reference by email
```

#### Example: Mixed ID Styles

```yaml
# Explicit numeric ID
- id: 1
  name: Sarah Chen
  title: CEO

# Auto-generated ID (will be 2)
- name: Michael Rodriguez
  title: CTO
  parentId: 1
```

### Supervisor Name Lookup

Instead of using `parentId`, you can specify a supervisor by name. YChart will automatically look up the parent node by matching names.

#### Supported Field Names

The following fields are checked (in order) for supervisor lookup:

| Field | Example |
|-------|---------|
| `supervisor` | `supervisor: Sarah Chen` |
| `reports` | `reports: Sarah Chen` |
| `reports_to` | `reports_to: Sarah Chen` |
| `manager` | `manager: Sarah Chen` |
| `leader` | `leader: Sarah Chen` |
| `parent` | `parent: Sarah Chen` |

#### Example: Supervisor-Based Hierarchy

```yaml
# Root node (no supervisor, no parentId)
- name: Sarah Chen
  email: sarah.chen@company.com
  title: CEO

# Child nodes use supervisor name
- name: Michael Rodriguez
  email: michael.rodriguez@company.com
  title: CTO
  supervisor: Sarah Chen

- name: Emily Watson
  email: emily.watson@company.com
  title: CFO
  supervisor: Sarah Chen

- name: Jennifer Martinez
  email: jennifer.martinez@company.com
  title: VP Engineering
  supervisor: Michael Rodriguez
```

This is equivalent to:

```yaml
- id: sarah.chen@company.com
  name: Sarah Chen
  title: CEO
  parentId: null

- id: michael.rodriguez@company.com
  name: Michael Rodriguez
  title: CTO
  parentId: sarah.chen@company.com

- id: emily.watson@company.com
  name: Emily Watson
  title: CFO
  parentId: sarah.chen@company.com

- id: jennifer.martinez@company.com
  name: Jennifer Martinez
  title: VP Engineering
  parentId: michael.rodriguez@company.com
```

### Resolution Priority

When determining parent relationships, YChart uses this priority:

1. **Explicit `parentId`** - Always takes precedence if specified
2. **Supervisor name lookup** - Checked if `parentId` is missing
3. **Root node** - If no parent can be resolved, node becomes a root

### Case-Insensitive Matching

Name lookups are case-insensitive:

```yaml
- name: Sarah Chen
  title: CEO

- name: Michael Rodriguez
  supervisor: SARAH CHEN  # Matches "Sarah Chen"
```

## YAML Linting & Validation

YChart includes real-time YAML validation powered by CodeMirror's linting infrastructure. The editor validates both syntax and semantic correctness of your org chart data.

### Validation Features

The linter checks for:

1. **YAML Syntax Errors** - Invalid YAML formatting, indentation issues, etc.
2. **Data Structure** - Ensures the YAML data is an array of objects
3. **Invalid Parent References** - Detects when a `parentId` points to a non-existent node

**Note:** Multiple root nodes (nodes with `parentId: null` or undefined) are fully supported. They will be rendered as separate trees.

### Inline Error Indicators

Errors are highlighted directly in the editor with wavy underlines and gutter markers:

![Inline lint errors showing wavy underlines](screenshots/error-lint-inline.png)

- **Red wavy underline** - Syntax or validation error
- **Yellow wavy underline** - Warning
- **Gutter markers** - Quick visual indicator of lines with issues

### Error Banner

When validation errors exist, an error banner appears above the editor with a summary of all issues:

![Error banner showing validation errors](screenshots/error-banner-working.png)

Each error in the banner includes:
- **Line number button** (e.g., `L15`) - Click to jump directly to the error
- **Error message** - Description of what's wrong

### Jump to Error

Click any line number button in the error banner to instantly navigate to that line in the editor:

![Editor jumped to error line](screenshots/jumped-to-error-line.png)

The editor will:
1. Scroll the error line into view
2. Highlight the entire line
3. Focus the editor for immediate editing

## Error Types

### Syntax Errors

```yaml
# Missing colon
- id 1
  name: John
```

The linter will highlight the malformed line and show the YAML parser's error message.

### Invalid Parent Reference

```yaml
- id: 1
  name: CEO
  parentId: null

- id: 2
  name: CTO
  parentId: 999  # Error: no node with id 999 exists
```

### Non-Array Data

```yaml
# Error: data must be an array
company: Acme Corp
employees:
  - name: John
```

The org chart data must be a YAML array (starting with `- `), not an object.

## API Reference

### supervisorLookup()

Configure which fields are used for supervisor name lookup and name matching.

```typescript
supervisorLookup(supervisorFieldNames: string | string[], nameFieldName?: string): this
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `supervisorFieldNames` | `string \| string[]` | `['supervisor', 'reports', 'reports_to', 'manager', 'leader', 'parent']` | Field name(s) to check for supervisor |
| `nameFieldName` | `string` | `'name'` | Field containing the node's name for matching |

#### Example: Custom Field Names

```typescript
// Use 'reports_to' field to look up by 'fullName'
new YChartEditor()
  .initView('container', yamlData)
  .supervisorLookup('reports_to', 'fullName');
```

```yaml
# YAML using custom field names
- fullName: Sarah Chen
  title: CEO

- fullName: Michael Rodriguez
  title: CTO
  reports_to: Sarah Chen
```

#### Example: Multiple Lookup Fields

```typescript
// Check multiple fields in order
new YChartEditor()
  .initView('container', yamlData)
  .supervisorLookup(['manager', 'team_lead', 'supervisor']);
```

## Best Practices

1. **Fix errors before switching views** - Errors may prevent the chart from rendering correctly
2. **Use the error banner** - Click line numbers to quickly navigate to issues
3. **Check parent references** - Ensure all `parentId` values reference existing node `id` values or valid email addresses
4. **Multiple roots supported** - You can have multiple nodes with `parentId: null` or omit `parentId` to create multiple tree hierarchies
5. **Use email as ID** - For cleaner YAML, omit `id` fields and let emails serve as natural identifiers
6. **Use supervisor names** - Omit `parentId` and use human-readable supervisor names for easier maintenance
