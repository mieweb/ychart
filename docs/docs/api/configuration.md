---
sidebar_position: 1
---

# Configuration Options

YChart provides extensive configuration options to customize the appearance and behavior of your organizational charts.

## Constructor Options

Pass options when creating a new YChartEditor instance:

```javascript
const chart = new YChartEditor({
  nodeWidth: 250,
  nodeHeight: 120,
  editorTheme: 'dark',
  // ... other options
});
```

## Available Options

### Layout Options

#### `nodeWidth`
- **Type**: `number`
- **Default**: `220`
- **Description**: Width of each node in pixels

```javascript
new YChartEditor({ nodeWidth: 250 });
```

#### `nodeHeight`
- **Type**: `number`
- **Default**: `110`
- **Description**: Height of each node in pixels

```javascript
new YChartEditor({ nodeHeight: 150 });
```

#### `siblingSeparation`
- **Type**: `number`
- **Default**: `100`
- **Description**: Horizontal spacing between sibling nodes in pixels

```javascript
new YChartEditor({ siblingSeparation: 120 });
```

#### `subtreeSeparation`
- **Type**: `number`
- **Default**: `100`
- **Description**: Horizontal spacing between subtrees in pixels

```javascript
new YChartEditor({ subtreeSeparation: 150 });
```

#### `levelSeparation`
- **Type**: `number`
- **Default**: `100`
- **Description**: Vertical spacing between hierarchy levels in pixels

```javascript
new YChartEditor({ levelSeparation: 120 });
```

### Editor Options

#### `editorTheme`
- **Type**: `'light' | 'dark'`
- **Default**: `'light'`
- **Description**: Theme for the YAML editor sidebar

```javascript
new YChartEditor({ editorTheme: 'dark' });
```

#### `editorWidth`
- **Type**: `number`
- **Default**: `400`
- **Description**: Width of the editor sidebar in pixels

```javascript
new YChartEditor({ editorWidth: 500 });
```

### Zoom & Pan Options

#### `initialZoom`
- **Type**: `number`
- **Default**: `1.0`
- **Description**: Initial zoom level (1.0 = 100%)

```javascript
new YChartEditor({ initialZoom: 0.8 });
```

#### `minZoom`
- **Type**: `number`
- **Default**: `0.1`
- **Description**: Minimum zoom level

```javascript
new YChartEditor({ minZoom: 0.2 });
```

#### `maxZoom`
- **Type**: `number`
- **Default**: `3.0`
- **Description**: Maximum zoom level

```javascript
new YChartEditor({ maxZoom: 5.0 });
```

## Fluent API Methods

### `initView(container, yamlData)`

Initialize the chart view.

**Parameters:**
- `container`: `string | HTMLElement` - Container element ID or DOM element
- `yamlData`: `string` - YAML data with optional front matter

**Returns:** `this` (for chaining)

```javascript
chart.initView('chart-container', yamlData);
```

### `bgPatternStyle(style)`

Set the background pattern style.

**Parameters:**
- `style`: `'none' | 'dotted' | 'grid' | 'lines'`

**Returns:** `this` (for chaining)

```javascript
chart.bgPatternStyle('dotted');
```

### `actionBtnPos(position, orientation)`

Set the position and orientation of action buttons.

**Parameters:**
- `position`: `'topleft' | 'topright' | 'bottomleft' | 'bottomright'`
- `orientation`: `'horizontal' | 'vertical'`

**Returns:** `this` (for chaining)

```javascript
chart.actionBtnPos('topright', 'horizontal');
```

Examples:

```javascript
// Top right corner, horizontal layout
chart.actionBtnPos('topright', 'horizontal');

// Bottom left corner, vertical layout
chart.actionBtnPos('bottomleft', 'vertical');

// Top left corner, horizontal layout
chart.actionBtnPos('topleft', 'horizontal');

// Bottom right corner, vertical layout
chart.actionBtnPos('bottomright', 'vertical');
```

### `template(templateFunction)`

Set a custom template function for rendering nodes.

**Parameters:**
- `templateFunction`: `(data: any, schema: any) => string` - Function that returns HTML string

**Returns:** `this` (for chaining)

```javascript
chart.template((data, schema) => {
  return `
    <div style="padding: 15px; background: white; border-radius: 8px;">
      <h3>${data.name}</h3>
      <p>${data.role}</p>
    </div>
  `;
});
```

### `onNodeClick(callback)`

Register a callback for node click events.

**Parameters:**
- `callback`: `(node: any) => void` - Callback function

**Returns:** `this` (for chaining)

```javascript
chart.onNodeClick((node) => {
  console.log('Clicked node:', node);
  showDetailsPanel(node.data);
});
```

### `switchToOrgView()`

Switch to hierarchical org chart view.

**Returns:** `void`

```javascript
chart.switchToOrgView();
```

### `switchToForceView()`

Switch to force-directed graph view.

**Returns:** `void`

```javascript
chart.switchToForceView();
```

### `toggleEditor()`

Toggle the visibility of the YAML editor sidebar.

**Returns:** `void`

```javascript
chart.toggleEditor();
```

### `exportSVG()`

Export the chart as an SVG file.

**Returns:** `void`

```javascript
chart.exportSVG();
```

### `exportPNG()`

Export the chart as a PNG image.

**Returns:** `void`

```javascript
chart.exportPNG();
```

### `updateData(yamlData)`

Update the chart with new YAML data.

**Parameters:**
- `yamlData`: `string` - New YAML data

**Returns:** `void`

```javascript
chart.updateData(newYamlData);
```

## Complete Configuration Example

```javascript
import { YChartEditor } from 'ychart-editor';

const chart = new YChartEditor({
  // Layout
  nodeWidth: 250,
  nodeHeight: 120,
  siblingSeparation: 120,
  subtreeSeparation: 150,
  levelSeparation: 120,
  
  // Editor
  editorTheme: 'dark',
  editorWidth: 450,
  
  // Zoom
  initialZoom: 0.9,
  minZoom: 0.2,
  maxZoom: 4.0
});

chart
  .initView('chart-container', yamlData)
  .bgPatternStyle('dotted')
  .actionBtnPos('topright', 'horizontal')
  .template((data, schema) => {
    return `
      <div class="custom-node">
        <h3>${data.name}</h3>
        <p>${data.role || 'N/A'}</p>
        <span>${data.email || ''}</span>
      </div>
    `;
  })
  .onNodeClick((node) => {
    console.log('Selected:', node.data.name);
  });
```

## YAML Front Matter Options

You can also configure options directly in the YAML data using front matter:

```yaml
---
options:
  nodeWidth: 250
  nodeHeight: 120
  siblingSeparation: 120
  editorTheme: light
schema:
  id: number | required
  name: string | required
  role: string
---
- id: 1
  name: CEO
  children:
    - id: 2
      name: CTO
```

## Next Steps

- [YAML Front Matter Guide](../guides/yaml-front-matter) - Learn about data format
- [Custom Templates](../guides/custom-templates) - Create custom node designs
- [Methods Reference](./methods) - Complete API methods reference
- [Examples](../examples/basic-org-chart) - See configuration in action
