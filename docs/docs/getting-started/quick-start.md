---
sidebar_position: 2
---

# Quick Start

Get started with YChart in just a few minutes! This guide will walk you through creating your first organizational chart.

## Step 1: Create HTML Container

First, create an HTML element where the chart will be rendered:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My First YChart</title>
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

## Step 2: Import YChart

Import YChart in your JavaScript/TypeScript file:

```javascript
import { YChartEditor } from 'ychart-editor';
```

## Step 3: Prepare Your Data

Define your organizational data in YAML format:

```javascript
const yamlData = `
---
options:
  nodeWidth: 250
  nodeHeight: 120
  editorTheme: light
schema:
  id: number | required
  name: string | required
  role: string
  email: string
---
- id: 1
  name: Sarah Johnson
  role: CEO
  email: sarah@company.com
  children:
    - id: 2
      name: Mike Chen
      role: CTO
      email: mike@company.com
      children:
        - id: 4
          name: Alex Kim
          role: Senior Developer
          email: alex@company.com
        - id: 5
          name: Emma Davis
          role: DevOps Engineer
          email: emma@company.com
    - id: 3
      name: Rachel Brown
      role: CFO
      email: rachel@company.com
      children:
        - id: 6
          name: Tom Wilson
          role: Accountant
          email: tom@company.com
`;
```

## Step 4: Initialize the Chart

Create a new YChart instance and initialize it:

```javascript
const chart = new YChartEditor({
  nodeWidth: 250,
  nodeHeight: 120,
  editorTheme: 'light'
});

chart.initView('chart-container', yamlData);
```

## Step 5: Customize (Optional)

Add customizations using the fluent API:

```javascript
chart
  .initView('chart-container', yamlData)
  .bgPatternStyle('dotted')
  .actionBtnPos('topright', 'horizontal')
  .template((data, schema) => {
    return `
      <div style="padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">
          ${data.name}
        </div>
        <div style="color: #666; font-size: 14px; margin-bottom: 3px;">
          ${data.role}
        </div>
        <div style="color: #999; font-size: 12px;">
          ${data.email}
        </div>
      </div>
    `;
  });
```

## Complete Example

Here's the complete working example:

```javascript
import { YChartEditor } from 'ychart-editor';

const yamlData = `
---
options:
  nodeWidth: 250
  nodeHeight: 120
schema:
  id: number | required
  name: string | required
  role: string
  email: string
---
- id: 1
  name: Sarah Johnson
  role: CEO
  email: sarah@company.com
  children:
    - id: 2
      name: Mike Chen
      role: CTO
      email: mike@company.com
    - id: 3
      name: Rachel Brown
      role: CFO
      email: rachel@company.com
`;

const chart = new YChartEditor({
  nodeWidth: 250,
  nodeHeight: 120,
  editorTheme: 'light'
});

chart
  .initView('chart-container', yamlData)
  .bgPatternStyle('dotted')
  .actionBtnPos('topright', 'horizontal');
```

## What's Next?

Now that you have a basic chart running, explore these topics:

- [Configuration Options](../api/configuration) - Learn about all available options
- [Custom Templates](../guides/custom-templates) - Create beautiful custom node designs
- [YAML Front Matter](../guides/yaml-front-matter) - Understand the data format
- [Framework Integration](../framework-integration/react) - Integrate with React, Vue, Svelte, etc.
- [Examples](../examples/basic-org-chart) - See more examples and use cases

## Common Issues

### Chart Not Rendering

Make sure:
1. The container element exists in the DOM
2. The container has a defined width and height
3. YChart is properly imported
4. YAML data is valid

### Editor Not Showing

By default, the editor sidebar is shown. To hide it initially:

```javascript
chart.initView('chart-container', yamlData, { showEditor: false });
```

### TypeScript Errors

If using TypeScript, make sure you have the type definitions:

```bash
npm install --save-dev @types/d3
```
