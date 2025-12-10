---
sidebar_position: 2
---

# Methods Reference

Complete reference for all YChartEditor methods.

## Initialization Methods

### `constructor(options?)`

Creates a new YChartEditor instance.

**Parameters:**
```typescript
interface YChartOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  siblingSeparation?: number;
  subtreeSeparation?: number;
  levelSeparation?: number;
  editorTheme?: 'light' | 'dark';
  editorWidth?: number;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
}
```

**Example:**
```javascript
const chart = new YChartEditor({
  nodeWidth: 220,
  nodeHeight: 110,
  editorTheme: 'light'
});
```

---

### `initView(container, yamlData, options?)`

Initialize the chart view with data.

**Parameters:**
- `container`: `string | HTMLElement` - Container element ID or DOM element
- `yamlData`: `string` - YAML data string with optional front matter
- `options?`: `object` - Optional initialization options
  - `showEditor`: `boolean` - Show/hide editor on init (default: `true`)

**Returns:** `this` (chainable)

**Example:**
```javascript
chart.initView('chart-container', yamlData);

// Without editor
chart.initView('chart-container', yamlData, { showEditor: false });
```

---

## View Management Methods

### `switchToOrgView()`

Switch to hierarchical organizational chart view.

**Returns:** `void`

**Example:**
```javascript
chart.switchToOrgView();
```

---

### `switchToForceView()`

Switch to force-directed graph view.

**Returns:** `void`

**Example:**
```javascript
chart.switchToForceView();
```

---

### `getCurrentView()`

Get the currently active view.

**Returns:** `'org' | 'force'`

**Example:**
```javascript
const currentView = chart.getCurrentView();
console.log(currentView); // 'org' or 'force'
```

---

## Data Management Methods

### `updateData(yamlData)`

Update the chart with new YAML data.

**Parameters:**
- `yamlData`: `string` - New YAML data string

**Returns:** `void`

**Example:**
```javascript
const newData = `
- id: 1
  name: New CEO
  children:
    - id: 2
      name: New CTO
`;

chart.updateData(newData);
```

---

### `getData()`

Get the current YAML data.

**Returns:** `string`

**Example:**
```javascript
const currentData = chart.getData();
console.log(currentData);
```

---

### `getDataAsJSON()`

Get the parsed data as JSON object.

**Returns:** `any`

**Example:**
```javascript
const jsonData = chart.getDataAsJSON();
console.log(jsonData);
```

---

## Styling & Customization Methods

### `bgPatternStyle(style)`

Set the background pattern style.

**Parameters:**
- `style`: `'none' | 'dotted' | 'grid' | 'lines'`

**Returns:** `this` (chainable)

**Example:**
```javascript
chart.bgPatternStyle('dotted');
chart.bgPatternStyle('grid');
chart.bgPatternStyle('lines');
chart.bgPatternStyle('none');
```

---

### `actionBtnPos(position, orientation)`

Set the position and orientation of action buttons.

**Parameters:**
- `position`: `'topleft' | 'topright' | 'bottomleft' | 'bottomright'`
- `orientation`: `'horizontal' | 'vertical'`

**Returns:** `this` (chainable)

**Example:**
```javascript
// Place buttons at top-right, horizontal layout
chart.actionBtnPos('topright', 'horizontal');

// Place buttons at bottom-left, vertical layout
chart.actionBtnPos('bottomleft', 'vertical');
```

**Visual Reference:**

```
topleft + horizontal       topright + horizontal
[btn][btn][btn]            [btn][btn][btn]



bottomleft + vertical      bottomright + horizontal
[btn]                      [btn][btn][btn]
[btn]
[btn]
```

---

### `template(templateFunction)`

Set a custom template function for rendering node content.

**Parameters:**
- `templateFunction`: `(data: any, schema?: any) => string` - Function returning HTML string

**Returns:** `this` (chainable)

**Example:**
```javascript
chart.template((data, schema) => {
  return `
    <div style="
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <h3 style="margin: 0 0 8px 0; font-size: 18px;">
        ${data.name}
      </h3>
      <p style="margin: 0; opacity: 0.9; font-size: 14px;">
        ${data.role || 'Employee'}
      </p>
      ${data.email ? `
        <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.8;">
          ${data.email}
        </p>
      ` : ''}
    </div>
  `;
});
```

---

## Editor Management Methods

### `toggleEditor()`

Toggle the visibility of the YAML editor sidebar.

**Returns:** `void`

**Example:**
```javascript
chart.toggleEditor();
```

---

### `showEditor()`

Show the YAML editor sidebar.

**Returns:** `void`

**Example:**
```javascript
chart.showEditor();
```

---

### `hideEditor()`

Hide the YAML editor sidebar.

**Returns:** `void`

**Example:**
```javascript
chart.hideEditor();
```

---

### `isEditorVisible()`

Check if the editor is currently visible.

**Returns:** `boolean`

**Example:**
```javascript
if (chart.isEditorVisible()) {
  console.log('Editor is visible');
}
```

---

## Event Handling Methods

### `onNodeClick(callback)`

Register a callback for node click events.

**Parameters:**
- `callback`: `(node: any) => void` - Callback function receiving node data

**Returns:** `this` (chainable)

**Example:**
```javascript
chart.onNodeClick((node) => {
  console.log('Node clicked:', node);
  console.log('Node ID:', node.data.id);
  console.log('Node name:', node.data.name);
  
  // Show details panel
  showNodeDetails(node.data);
});
```

---

### `onNodeDetailsClick(callback)`

Register a callback for node details button click events.

**Parameters:**
- `callback`: `(node: any) => void` - Callback function receiving node data

**Returns:** `this` (chainable)

**Example:**
```javascript
chart.onNodeDetailsClick((node) => {
  // Open modal with full details
  openDetailsModal(node.data);
});
```

---

### `onNodeSwap(callback)`

Register a callback for node swap events (drag-to-swap functionality).

**Parameters:**
- `callback`: `(node1: any, node2: any) => void` - Callback receiving both swapped nodes

**Returns:** `this` (chainable)

**Example:**
```javascript
chart.onNodeSwap((node1, node2) => {
  console.log(`Swapped ${node1.data.name} with ${node2.data.name}`);
  
  // Update backend
  updateNodeOrder(node1.data.id, node2.data.id);
});
```

---

## Export Methods

### `exportSVG(filename?)`

Export the chart as an SVG file.

**Parameters:**
- `filename?`: `string` - Optional filename (default: `'orgchart.svg'`)

**Returns:** `void`

**Example:**
```javascript
// Export with default name
chart.exportSVG();

// Export with custom name
chart.exportSVG('my-org-chart.svg');
```

---

### `exportPNG(filename?)`

Export the chart as a PNG image.

**Parameters:**
- `filename?`: `string` - Optional filename (default: `'orgchart.png'`)

**Returns:** `void`

**Example:**
```javascript
// Export with default name
chart.exportPNG();

// Export with custom name
chart.exportPNG('my-org-chart.png');
```

---

## Zoom & Pan Methods

### `zoomIn()`

Zoom in by one step.

**Returns:** `void`

**Example:**
```javascript
chart.zoomIn();
```

---

### `zoomOut()`

Zoom out by one step.

**Returns:** `void`

**Example:**
```javascript
chart.zoomOut();
```

---

### `resetZoom()`

Reset zoom to initial level.

**Returns:** `void`

**Example:**
```javascript
chart.resetZoom();
```

---

### `fitToScreen()`

Fit the entire chart to the visible area.

**Returns:** `void`

**Example:**
```javascript
chart.fitToScreen();
```

---

### `centerNode(nodeId)`

Center the view on a specific node.

**Parameters:**
- `nodeId`: `number | string` - ID of the node to center

**Returns:** `void`

**Example:**
```javascript
chart.centerNode(5);
```

---

## Node Interaction Methods

### `expandNode(nodeId)`

Expand a collapsed node.

**Parameters:**
- `nodeId`: `number | string` - ID of the node to expand

**Returns:** `void`

**Example:**
```javascript
chart.expandNode(2);
```

---

### `collapseNode(nodeId)`

Collapse an expanded node.

**Parameters:**
- `nodeId`: `number | string` - ID of the node to collapse

**Returns:** `void`

**Example:**
```javascript
chart.collapseNode(2);
```

---

### `expandAll()`

Expand all nodes in the chart.

**Returns:** `void`

**Example:**
```javascript
chart.expandAll();
```

---

### `collapseAll()`

Collapse all nodes except the root.

**Returns:** `void`

**Example:**
```javascript
chart.collapseAll();
```

---

## Utility Methods

### `getNodeById(nodeId)`

Get a node's data by its ID.

**Parameters:**
- `nodeId`: `number | string` - Node ID

**Returns:** `any | null`

**Example:**
```javascript
const node = chart.getNodeById(5);
if (node) {
  console.log(node.name);
}
```

---

### `destroy()`

Clean up and destroy the chart instance.

**Returns:** `void`

**Example:**
```javascript
// When removing the chart
chart.destroy();
```

---

## Method Chaining Example

Many methods return `this` for fluent chaining:

```javascript
const chart = new YChartEditor({ nodeWidth: 250 })
  .initView('container', yamlData)
  .bgPatternStyle('dotted')
  .actionBtnPos('topright', 'horizontal')
  .template((d) => `<div>${d.name}</div>`)
  .onNodeClick((node) => console.log(node))
  .onNodeSwap((n1, n2) => console.log('swapped'));

// Later, use non-chainable methods
chart.switchToForceView();
chart.exportSVG('my-chart.svg');
```

## Next Steps

- [Configuration Options](./configuration) - Learn about all configuration options
- [Custom Templates](../guides/custom-templates) - Create custom node templates
- [YAML Front Matter](../guides/yaml-front-matter) - Learn about data format
- [Examples](../examples/basic-org-chart) - See methods in action
