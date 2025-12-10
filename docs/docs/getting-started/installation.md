---
sidebar_position: 1
---

# Installation

YChart can be installed and used in multiple ways depending on your project setup.

## NPM Installation

Install YChart using npm:

```bash
npm install ychart-editor
```

Or using yarn:

```bash
yarn add ychart-editor
```

Or using pnpm:

```bash
pnpm add ychart-editor
```

## CDN Usage

You can also use YChart directly from a CDN without any build step:

```html
<!DOCTYPE html>
<html>
<head>
  <title>YChart Example</title>
</head>
<body>
  <div id="chart-container"></div>
  
  <!-- Include YChart from CDN -->
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
    `;
    
    new YChartEditor()
      .initView('chart-container', yamlData);
  </script>
</body>
</html>
```

## Local Development Build

If you want to build YChart from source:

```bash
# Clone the repository
git clone https://github.com/mieweb/orgchart.git
cd orgchart

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

The built files will be in the `dist/` directory.

## Requirements

- **Node.js**: Version 18.0 or above (for npm installation)
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **TypeScript**: Optional, but recommended for better IDE support

## Verify Installation

After installation, you can verify it's working by creating a simple test:

```javascript
import { YChartEditor } from 'ychart-editor';

const yamlData = `
- id: 1
  name: Test Node
`;

new YChartEditor()
  .initView('container-id', yamlData);
```

If you see the chart rendered, you're all set!

## Next Steps

- [Quick Start Guide](./quick-start) - Get up and running in 5 minutes
- [Framework Integration](../framework-integration/vanilla-js) - Learn how to integrate with your framework
- [Configuration Options](../api/configuration) - Explore all available options
