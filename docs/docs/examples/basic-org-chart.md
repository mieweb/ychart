---
sidebar_position: 1
---

# Basic Org Chart

A simple organizational chart showing company hierarchy.

## Demo

```yaml
---
options:
  nodeWidth: 220
  nodeHeight: 110
  editorTheme: light
schema:
  id: number | required
  name: string | required
  role: string
---
- id: 1
  name: Sarah Johnson
  role: CEO
  children:
    - id: 2
      name: Mike Chen
      role: CTO
      children:
        - id: 4
          name: Alex Kim
          role: Senior Developer
        - id: 5
          name: Emma Davis
          role: DevOps Engineer
    - id: 3
      name: Rachel Brown
      role: CFO
      children:
        - id: 6
          name: Tom Wilson
          role: Accountant
```

## Implementation

```javascript
import { YChartEditor } from 'ychart-editor';

const yamlData = `
---
options:
  nodeWidth: 220
  nodeHeight: 110
schema:
  id: number | required
  name: string | required
  role: string
---
- id: 1
  name: Sarah Johnson
  role: CEO
  children:
    - id: 2
      name: Mike Chen
      role: CTO
    - id: 3
      name: Rachel Brown
      role: CFO
`;

const chart = new YChartEditor();
chart.initView('chart-container', yamlData);
```

## Features

- ✅ Hierarchical tree layout
- ✅ Expand/collapse functionality
- ✅ Zoom and pan controls
- ✅ Export to SVG/PNG
- ✅ YAML editor

## HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Basic Org Chart</title>
  <style>
    #chart-container {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="chart-container"></div>
  <script type="module" src="main.js"></script>
</body>
</html>
```

## Customization Options

### Change Node Size

```javascript
const chart = new YChartEditor({
  nodeWidth: 250,
  nodeHeight: 130
});
```

### Change Spacing

```javascript
const chart = new YChartEditor({
  siblingSeparation: 150,
  levelSeparation: 120
});
```

### Add Background Pattern

```javascript
chart
  .initView('chart-container', yamlData)
  .bgPatternStyle('dotted');
```

### Position Action Buttons

```javascript
chart
  .initView('chart-container', yamlData)
  .actionBtnPos('topright', 'horizontal');
```

## Next Steps

- [Custom Templates Guide](../guides/custom-templates) - Learn to customize node appearance
- [YAML Front Matter](../guides/yaml-front-matter) - Learn about data format
- [API Configuration](../api/configuration) - Explore all options
