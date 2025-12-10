---
sidebar_position: 1
---

# Vanilla JavaScript

Learn how to integrate YChart into a vanilla JavaScript project without any framework.

## Installation

### Using NPM

```bash
npm install ychart-editor
```

### Using CDN

```html
<script src="https://unpkg.com/ychart-editor@latest/dist/ychart-editor.umd.js"></script>
```

## Basic Setup

### With Module Bundler (Webpack/Vite)

```javascript
// main.js
import { YChartEditor } from 'ychart-editor';
import 'ychart-editor/dist/style.css';

const yamlData = `
- id: 1
  name: CEO
  children:
    - id: 2
      name: CTO
    - id: 3
      name: CFO
`;

const chart = new YChartEditor({
  nodeWidth: 220,
  nodeHeight: 110
});

chart.initView('chart-container', yamlData);
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YChart - Vanilla JS</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
    }
    #chart-container {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="chart-container"></div>
  <script type="module" src="/main.js"></script>
</body>
</html>
```

### Without Module Bundler (CDN)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YChart - Vanilla JS (CDN)</title>
  <link rel="stylesheet" href="https://unpkg.com/ychart-editor@latest/dist/style.css">
  <style>
    body { margin: 0; }
    #chart-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="chart-container"></div>
  
  <script src="https://unpkg.com/ychart-editor@latest/dist/ychart-editor.umd.js"></script>
  <script>
    const yamlData = `
---
options:
  nodeWidth: 220
  nodeHeight: 110
---
- id: 1
  name: CEO
  children:
    - id: 2
      name: CTO
    - id: 3
      name: CFO
    `;
    
    const chart = new YChartEditor({
      nodeWidth: 220,
      nodeHeight: 110,
      editorTheme: 'light'
    });
    
    chart.initView('chart-container', yamlData);
  </script>
</body>
</html>
```

## Advanced Features

### Custom Templates

```javascript
const chart = new YChartEditor();

chart
  .initView('chart-container', yamlData)
  .template((data, schema) => {
    return `
      <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 8px 0;">${data.name}</h3>
        <p style="margin: 0; opacity: 0.9;">${data.role || 'Employee'}</p>
      </div>
    `;
  });
```

### Dynamic Data Loading

```javascript
// Load data from API
async function loadChartData() {
  try {
    const response = await fetch('/api/org-chart');
    const yamlData = await response.text();
    
    const chart = new YChartEditor();
    chart.initView('chart-container', yamlData);
  } catch (error) {
    console.error('Failed to load chart data:', error);
  }
}

loadChartData();
```

### Event Handling

```javascript
const chart = new YChartEditor();

chart
  .initView('chart-container', yamlData)
  .onNodeClick((node) => {
    console.log('Node clicked:', node);
    // Show details panel or modal
    showNodeDetails(node);
  });

function showNodeDetails(node) {
  const detailsPanel = document.getElementById('details-panel');
  detailsPanel.innerHTML = `
    <h2>${node.data.name}</h2>
    <p>ID: ${node.data.id}</p>
    <p>Role: ${node.data.role || 'N/A'}</p>
  `;
  detailsPanel.style.display = 'block';
}
```

### Multiple Charts

```javascript
// Create multiple independent charts
const chart1 = new YChartEditor({
  nodeWidth: 200,
  nodeHeight: 100
});

const chart2 = new YChartEditor({
  nodeWidth: 250,
  nodeHeight: 120
});

chart1.initView('chart-container-1', yamlData1);
chart2.initView('chart-container-2', yamlData2);
```

### Switching Between Views

```javascript
const chart = new YChartEditor();
chart.initView('chart-container', yamlData);

// Add view toggle buttons
document.getElementById('btn-org-view').addEventListener('click', () => {
  chart.switchToOrgView();
});

document.getElementById('btn-force-view').addEventListener('click', () => {
  chart.switchToForceView();
});
```

## Complete Example with Controls

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>YChart - Full Example</title>
  <link rel="stylesheet" href="https://unpkg.com/ychart-editor@latest/dist/style.css">
  <style>
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #controls {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    button {
      margin: 5px;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: #667eea;
      color: white;
      cursor: pointer;
    }
    button:hover {
      background: #5568d3;
    }
    #chart-container {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="controls">
    <div>
      <button id="btn-org-view">Org Chart</button>
      <button id="btn-force-view">Force Graph</button>
    </div>
    <div>
      <button id="btn-toggle-editor">Toggle Editor</button>
      <button id="btn-export-svg">Export SVG</button>
      <button id="btn-export-png">Export PNG</button>
    </div>
  </div>
  
  <div id="chart-container"></div>
  
  <script src="https://unpkg.com/ychart-editor@latest/dist/ychart-editor.umd.js"></script>
  <script>
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
    `;
    
    const chart = new YChartEditor({
      nodeWidth: 220,
      nodeHeight: 110,
      editorTheme: 'light'
    });
    
    chart
      .initView('chart-container', yamlData)
      .bgPatternStyle('dotted')
      .actionBtnPos('bottomleft', 'horizontal');
    
    // Event handlers
    document.getElementById('btn-org-view').addEventListener('click', () => {
      chart.switchToOrgView();
    });
    
    document.getElementById('btn-force-view').addEventListener('click', () => {
      chart.switchToForceView();
    });
    
    document.getElementById('btn-toggle-editor').addEventListener('click', () => {
      chart.toggleEditor();
    });
    
    document.getElementById('btn-export-svg').addEventListener('click', () => {
      chart.exportSVG();
    });
    
    document.getElementById('btn-export-png').addEventListener('click', () => {
      chart.exportPNG();
    });
  </script>
</body>
</html>
```

## Browser Compatibility Notes

### Safari Specific

YChart automatically handles Safari's `foreignObject` limitations by using an HTML overlay. No additional configuration needed.

### Internet Explorer

YChart does not support Internet Explorer. Please use a modern browser (Chrome, Firefox, Safari, or Edge).

## Troubleshooting

### Chart Not Rendering

1. Check that the container element exists:
```javascript
const container = document.getElementById('chart-container');
console.log('Container exists:', !!container);
```

2. Ensure container has dimensions:
```javascript
const rect = container.getBoundingClientRect();
console.log('Container dimensions:', rect.width, rect.height);
```

3. Check browser console for errors

### Styles Not Applied

Make sure to include the CSS file:
```html
<link rel="stylesheet" href="https://unpkg.com/ychart-editor@latest/dist/style.css">
```

Or import it in JavaScript:
```javascript
import 'ychart-editor/dist/style.css';
```

## Next Steps

- [React Integration](./react) - Learn how to use YChart with React
- [Configuration Options](../api/configuration) - Explore all configuration options
- [Custom Templates](../guides/custom-templates) - Create custom node templates
- [Examples](../examples/basic-org-chart) - See more examples
