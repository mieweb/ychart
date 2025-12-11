# YChart - Org Chart Editor

A beautiful, interactive organizational chart editor with YAML input powered by **d3-org-chart**. Edit YAML in real-time with front-matter schema configuration and see your org chart update instantly!

* Try it in the [Playground](https://orgchart.opensource.mieweb.org/)
* [Read the docs](https://orgchart.opensource.mieweb.org/docs)

## Features

- 📝 **YAML Editor** - CodeMirror editor with syntax highlighting
- 📊 **d3-org-chart** - Professional, battle-tested org chart library by David Bumbeishvili
- 🎯 **Front Matter Schema** - Configure chart layout using YAML front matter
- 🎨 **Customizable** - Full control over spacing, layout, and styling
- 📱 **Responsive** - Works on desktop and mobile devices
- 💾 **Export** - Download your org chart as SVG or PNG
- 🔄 **Real-time Updates** - Chart updates as you type
- ⚡ **Fast & Efficient** - Optimized layout algorithms
- 🖱️ **Draggable Nodes** - Rearrange nodes by dragging them
- 💾 **Position Persistence** - Node positions saved in browser localStorage
- 🔀 **Dual View Modes** - Switch between hierarchical and force-directed graph layouts

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

### Build for Production

```bash
pnpm build
```

## YAML Format with Front Matter

The editor supports **YAML front matter** for both chart options and data schema validation:

```yaml
---
options:
  nodeWidth: 220
  nodeHeight: 110
  childrenMargin: 50
  compactMarginBetween: 35
  compactMarginPair: 30
  neighbourMargin: 20
schema:
  id: number | required
  name: string | required
  title: string | optional
  department: string | required
  email: string | required
  picture: string | optional | missing
---

- id: 1
  name: John Smith
  title: CEO
  department: Executive
  email: john.smith@company.com

- id: 2
  parentId: 1
  name: Sarah Johnson
  title: CTO
  department: Technology
  email: sarah.johnson@company.com

- id: 3
  parentId: 1
  name: Mike Chen
  title: CFO
  department: Finance
  email: mike.chen@company.com
```

### Options (Chart Layout)

Configure chart visual layout in the `options` section:

- `nodeWidth` - Width of each node card (default: 220)
- `nodeHeight` - Height of each node card (default: 110)
- `childrenMargin` - Vertical space between parent and children (default: 50)
- `compactMarginBetween` - Horizontal space between sibling nodes (default: 35)
- `compactMarginPair` - Space for paired nodes (default: 30)
- `neighbourMargin` - Space between cousin nodes (default: 20)

If any option is missing or the entire `options` section is omitted, defaults are used.

### Schema (Data Validation)

Define your data structure in the `schema` section using the format:

```
fieldName: type | modifier | modifier
```

**Types:**
- `string` - Text values
- `number` - Numeric values
- `boolean` - True/false values

**Modifiers:**
- `required` - Field must be present in every item
- `optional` - Field may be present but not mandatory
- `missing` - Field can be completely absent without causing errors (useful for optional fields like profile pictures)

**Examples:**
```yaml
schema:
  id: number | required              # Must exist and be a number
  name: string | required             # Must exist and be a string
  title: string | optional            # Can exist, must be string if present
  email: string | required            # Must exist and be a string
  picture: string | optional | missing # Can be absent, no validation error
```

If the `schema` section is omitted, no validation is performed.

### Required Fields

- `id` (number|string) - Unique identifier for each person
- `name` (string) - The person's name

### Optional Fields

- `parentId` (number|string) - ID of the person's manager (omit for root nodes)
- `title` (string) - Job title
- `department` (string) - Department name
- `email` (string) - Email address
- `phone` (string) - Phone number
- Any other custom fields you want to include

### Multiple Root Nodes

Simply omit the `parentId` field for top-level employees:

```yaml
- id: 1
  name: CEO
  title: Chief Executive Officer

- id: 2
  name: Board Chair
  title: Board Chairperson

- id: 3
  parentId: 1
  name: CTO
  title: Chief Technology Officer
```

### Node Ordering

The order of nodes in the YAML determines their visual order within the same hierarchy level:

- **Siblings** (nodes with the same parent) are displayed in the order they appear in YAML
- Use the **↑ Move Up** and **↓ Move Down** buttons in the node details panel to reorder
- Reordering only affects nodes at the same level (siblings)
- Changes are immediately reflected in both the YAML editor and the chart

**Example:**
```yaml
- id: 1
  name: CEO
  
- id: 2      # First child - appears first
  parentId: 1
  name: CTO
  
- id: 3      # Second child - appears second
  parentId: 1
  name: CFO
  
- id: 4      # Third child - appears third
  parentId: 1
  name: CMO
```

## Using d3-org-chart in Your Project

This project uses the excellent **[d3-org-chart](https://github.com/bumbeishvili/org-chart)** library by David Bumbeishvili.

### Installation

```bash
npm install d3-org-chart d3
```

### Basic Usage

```typescript
import { OrgChart } from 'd3-org-chart';

// Your data - each employee needs an 'id' and 'parentId'
const data = [
  { id: 1, name: "John Smith", title: "CEO" },
  { id: 2, parentId: 1, name: "Sarah Johnson", title: "CTO" },
  { id: 3, parentId: 1, name: "Mike Chen", title: "CFO" },
];

// Create and render chart
new OrgChart()
  .container('#chart')
  .data(data)
  .nodeHeight((_d: any) => 110)
  .nodeWidth((_d: any) => 220)
  .childrenMargin((_d: any) => 50)
  .compactMarginBetween((_d: any) => 35)
  .neighbourMargin((_d: any) => 20)
  .render()
  .fit();
```

**That's it!** Simple, powerful, and battle-tested.

### Front Matter Configuration

You can configure chart layout and validate data structure using YAML front matter:

```yaml
---
options:
  nodeWidth: 300
  nodeHeight: 150
  childrenMargin: 80
  compactMarginBetween: 50
  compactMarginPair: 40
  neighbourMargin: 30
schema:
  id: number | required
  name: string | required
  title: string | optional
  department: string | required
  email: string | required
  picture: string | optional | missing
---
- id: 1
  name: John Smith
  title: CEO
  department: Executive
  email: john.smith@company.com
  ...
```

This allows:
- Per-chart layout customization via `options`
- Data validation via `schema` definitions
- Fields marked with `missing` can be omitted without errors

### Configuration Options

The chart supports configuration through:

1. **Default options** in `main.ts`:
```typescript
const defaultOptions = {
  nodeWidth: 220,
  nodeHeight: 110,
  childrenMargin: 50,
  compactMarginBetween: 35,
  compactMarginPair: 30,
  neighbourMargin: 20
};
```

2. **YAML front matter** (overrides defaults):
```yaml
---
options:
  nodeWidth: 300
  nodeHeight: 150
  childrenMargin: 80
schema:
  id: number | required
  name: string | required
  department: string | required
---
```

The front matter approach allows you to:
- **Configure layout per-chart** using `options`
- **Validate data structure** using `schema`
- **Use defaults** for any omitted options
- **Skip validation** by omitting the `schema` section

All configuration values are wrapped as functions when passed to d3-org-chart:
```typescript
.nodeWidth((_d: any) => options.nodeWidth)
.nodeHeight((_d: any) => options.nodeHeight)
```

For more advanced configuration (colors, animations, custom renderers), see the [d3-org-chart API documentation](https://github.com/bumbeishvili/org-chart#api)
```

### Custom Node Rendering

The current implementation uses d3-org-chart's default node template with custom HTML styling. You can customize node appearance by modifying the `.nodeContent` method in `main.ts`:

```typescript
.nodeContent((d: any) => {
  return `
    <div class="node-card">
      <div class="node-name">${d.data.name}</div>
      <div class="node-title">${d.data.title || ''}</div>
      <div class="node-department">${d.data.department || ''}</div>
    </div>
  `;
})
```

Then add corresponding CSS in `style.css`. For more advanced customization options, see the [d3-org-chart customization guide](https://github.com/bumbeishvili/org-chart#customization).

### Key Methods

The application uses these d3-org-chart methods:
chart.render(data);

// Update with new data (same as render)
chart.update(newData);

// Export chart as SVG
chart.exportSvg();

// Export chart as PNG
chart.exportPng();

// Fit chart to viewport
chart.fit();

// Resize chart (call after window resize)
chart.resize();
```

For the complete API reference and more methods, see the [d3-org-chart documentation](https://github.com/bumbeishvili/org-chart#api).

## Examples

### Example 1: Simple HTML Integration

```html
<!DOCTYPE html>
<html>
<body>
  <div id="chart" style="width: 100%; height: 600px;"></div>
  <script type="module">
    import { OrgChart } from 'd3-org-chart';
    
    const data = [
      { id: 1, name: 'CEO' },
      { id: 2, parentId: 1, name: 'CTO' },
      { id: 3, parentId: 1, name: 'CFO' }
    ];
    
    new OrgChart()
      .container('#chart')
      .data(data)
      .nodeHeight((_d) => 110)
      .nodeWidth((_d) => 220)
      .render()
      .fit();
  </script>
</body>
</html>
```

### Example 2: React Integration

```tsx
import { useEffect, useRef } from 'react';
import { OrgChart } from 'd3-org-chart';

interface Employee {
  id: number;
  parentId?: number;
  name: string;
  title?: string;
}

export function OrgChartComponent({ data }: { data: Employee[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<OrgChart | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      chartRef.current = new OrgChart()
        .container(containerRef.current)
        .nodeHeight((_d: any) => 110)
        .nodeWidth((_d: any) => 220);
    }

    return () => {
      if (chartRef.current) {
        // Cleanup if needed
      }
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && data) {
      chartRef.current
        .data(data)
        .render()
        .fit();
    }
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

### Example 3: Vue Integration

```vue
<template>
  <div ref="chartContainer" style="width: 100%; height: 600px"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { OrgChart } from 'd3-org-chart';

interface Employee {
  id: number;
  parentId?: number;
  name: string;
  title?: string;
}

const props = defineProps<{ data: Employee[] }>();
const chartContainer = ref<HTMLElement>();
let chart: OrgChart | null = null;

onMounted(() => {
  if (chartContainer.value) {
    chart = new OrgChart()
      .container(chartContainer.value)
      .nodeHeight((_d: any) => 110)
      .nodeWidth((_d: any) => 220);
  }
});

watch(() => props.data, (newData) => {
  if (chart && newData) {
    chart
      .data(newData)
      .render()
      .fit();
  }
});
</script>
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT

## Credits

Built with:
- [d3-org-chart](https://github.com/bumbeishvili/org-chart) by David Bumbeishvili - Org chart visualization
- [D3.js](https://d3js.org/) - Data visualization
- [CodeMirror](https://codemirror.net/) - Code editor
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML parser

---

Made with ❤️ by [MIE](https://mieweb.com/)
# Test deployment
