---
sidebar_position: 1
---

# Introduction to YChart

YChart is an interactive organizational chart editor built with TypeScript, D3.js, and the d3-org-chart library. It provides a powerful YAML-based data editor with real-time chart visualization, supporting both hierarchical org charts and force-directed graph layouts.

## Key Features

- 📊 **Dual Visualization Modes**: Hierarchical org chart and force-directed graph layouts
- ✏️ **Live YAML Editor**: Real-time editing with syntax highlighting powered by CodeMirror 6
- 🎨 **Customizable Templates**: Define custom node templates using HTML and CSS
- 📱 **Responsive & Accessible**: ARIA-compliant with keyboard navigation support
- 🔄 **Interactive Controls**: Expand/collapse nodes, drag-to-swap, zoom/pan
- 🎯 **Cross-Browser Compatible**: Works seamlessly in Chrome, Firefox, Safari, and Edge
- 📤 **Export Options**: Export charts as SVG or PNG
- 🌐 **Framework Agnostic**: Use with Vanilla JS, React, Svelte, Vue, and more

## What You Can Build

YChart is perfect for creating:

- **Organizational Charts**: Visualize company hierarchies and team structures
- **Project Dependencies**: Map project workflows and task relationships
- **Family Trees**: Create genealogical charts
- **Network Diagrams**: Display network topologies and relationships
- **Process Flows**: Visualize business processes and workflows

## Quick Preview

```yaml
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
  name: CEO
  role: Chief Executive Officer
  children:
    - id: 2
      name: CTO
      role: Chief Technology Officer
    - id: 3
      name: CFO
      role: Chief Financial Officer
```

## Browser Support

YChart is tested and works on:

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest, with HTML overlay support)
- ✅ Opera (latest)

## Next Steps

Ready to get started? Check out our [Installation Guide](./getting-started/installation) to install YChart in your project.
