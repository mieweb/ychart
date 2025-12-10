---
sidebar_position: 2
---

# React Integration

Learn how to integrate YChart into your React application with proper component lifecycle management.

## Installation

```bash
npm install ychart-editor
# or
yarn add ychart-editor
# or
pnpm add ychart-editor
```

## Basic Component

Create a reusable React component for YChart:

```tsx
// YChart.tsx
import React, { useEffect, useRef } from 'react';
import { YChartEditor } from 'ychart-editor';
import 'ychart-editor/dist/style.css';

interface YChartProps {
  yamlData: string;
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    editorTheme?: 'light' | 'dark';
  };
  onNodeClick?: (node: any) => void;
}

const YChart: React.FC<YChartProps> = ({ yamlData, options, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<YChartEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize chart
    chartRef.current = new YChartEditor(options);
    chartRef.current.initView(containerRef.current, yamlData);

    if (onNodeClick) {
      chartRef.current.onNodeClick(onNodeClick);
    }

    // Cleanup on unmount
    return () => {
      chartRef.current = null;
    };
  }, []);

  // Update data when yamlData changes
  useEffect(() => {
    if (chartRef.current && yamlData) {
      chartRef.current.updateData(yamlData);
    }
  }, [yamlData]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default YChart;
```

## Usage in App

```tsx
// App.tsx
import React, { useState } from 'react';
import YChart from './components/YChart';

const App: React.FC = () => {
  const [yamlData] = useState(`
---
options:
  nodeWidth: 220
  nodeHeight: 110
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
  `);

  const handleNodeClick = (node: any) => {
    console.log('Node clicked:', node);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <YChart
        yamlData={yamlData}
        options={{
          nodeWidth: 220,
          nodeHeight: 110,
          editorTheme: 'light'
        }}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
};

export default App;
```

## Advanced Component with State Management

```tsx
// AdvancedYChart.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { YChartEditor } from 'ychart-editor';
import 'ychart-editor/dist/style.css';

interface AdvancedYChartProps {
  initialData: string;
  onDataChange?: (data: string) => void;
}

const AdvancedYChart: React.FC<AdvancedYChartProps> = ({
  initialData,
  onDataChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<YChartEditor | null>(null);
  const [currentView, setCurrentView] = useState<'org' | 'force'>('org');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = new YChartEditor({
      nodeWidth: 220,
      nodeHeight: 110,
      editorTheme: 'light'
    });

    chartRef.current
      .initView(containerRef.current, initialData)
      .bgPatternStyle('dotted')
      .actionBtnPos('bottomleft', 'horizontal')
      .onNodeClick((node) => {
        setSelectedNode(node);
      });

    return () => {
      chartRef.current = null;
    };
  }, [initialData]);

  const switchView = useCallback((view: 'org' | 'force') => {
    if (chartRef.current) {
      if (view === 'org') {
        chartRef.current.switchToOrgView();
      } else {
        chartRef.current.switchToForceView();
      }
      setCurrentView(view);
    }
  }, []);

  const exportChart = useCallback((format: 'svg' | 'png') => {
    if (chartRef.current) {
      if (format === 'svg') {
        chartRef.current.exportSVG();
      } else {
        chartRef.current.exportPNG();
      }
    }
  }, []);

  const toggleEditor = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.toggleEditor();
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={() => switchView('org')}
            disabled={currentView === 'org'}
            style={{
              marginRight: '5px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: currentView === 'org' ? '#667eea' : '#e0e0e0',
              color: currentView === 'org' ? 'white' : 'black',
              cursor: 'pointer'
            }}
          >
            Org Chart
          </button>
          <button
            onClick={() => switchView('force')}
            disabled={currentView === 'force'}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: currentView === 'force' ? '#667eea' : '#e0e0e0',
              color: currentView === 'force' ? 'white' : 'black',
              cursor: 'pointer'
            }}
          >
            Force Graph
          </button>
        </div>
        <div>
          <button
            onClick={toggleEditor}
            style={{
              marginRight: '5px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: '#764ba2',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Toggle Editor
          </button>
          <button
            onClick={() => exportChart('svg')}
            style={{
              marginRight: '5px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: '#f093fb',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Export SVG
          </button>
          <button
            onClick={() => exportChart('png')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: '#4facfe',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 1000,
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '300px'
        }}>
          <h3 style={{ marginTop: 0 }}>Node Details</h3>
          <p><strong>ID:</strong> {selectedNode.data.id}</p>
          <p><strong>Name:</strong> {selectedNode.data.name}</p>
          {selectedNode.data.role && (
            <p><strong>Role:</strong> {selectedNode.data.role}</p>
          )}
          <button
            onClick={() => setSelectedNode(null)}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              background: '#e0e0e0',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Chart Container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default AdvancedYChart;
```

## With React Hooks

### Custom Hook for YChart

```tsx
// useYChart.ts
import { useEffect, useRef, useState } from 'react';
import { YChartEditor } from 'ychart-editor';

interface UseYChartOptions {
  yamlData: string;
  containerRef: React.RefObject<HTMLDivElement>;
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    editorTheme?: 'light' | 'dark';
  };
}

export const useYChart = ({ yamlData, containerRef, options }: UseYChartOptions) => {
  const chartRef = useRef<YChartEditor | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = new YChartEditor(options);
    chartRef.current.initView(containerRef.current, yamlData);
    setIsReady(true);

    return () => {
      chartRef.current = null;
      setIsReady(false);
    };
  }, []);

  const switchToOrgView = () => {
    chartRef.current?.switchToOrgView();
  };

  const switchToForceView = () => {
    chartRef.current?.switchToForceView();
  };

  const exportSVG = () => {
    chartRef.current?.exportSVG();
  };

  const exportPNG = () => {
    chartRef.current?.exportPNG();
  };

  const updateData = (newData: string) => {
    chartRef.current?.updateData(newData);
  };

  return {
    isReady,
    switchToOrgView,
    switchToForceView,
    exportSVG,
    exportPNG,
    updateData,
    chart: chartRef.current
  };
};
```

### Using the Custom Hook

```tsx
// ChartWithHook.tsx
import React, { useRef } from 'react';
import { useYChart } from './hooks/useYChart';

const ChartWithHook: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const yamlData = `
- id: 1
  name: CEO
  children:
    - id: 2
      name: CTO
  `;

  const {
    isReady,
    switchToOrgView,
    switchToForceView,
    exportSVG,
    exportPNG
  } = useYChart({
    yamlData,
    containerRef,
    options: {
      nodeWidth: 220,
      nodeHeight: 110,
      editorTheme: 'light'
    }
  });

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {isReady && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
          <button onClick={switchToOrgView}>Org View</button>
          <button onClick={switchToForceView}>Force View</button>
          <button onClick={exportSVG}>Export SVG</button>
          <button onClick={exportPNG}>Export PNG</button>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default ChartWithHook;
```

## TypeScript Support

YChart comes with TypeScript definitions. For better type safety:

```tsx
import { YChartEditor, YChartOptions } from 'ychart-editor';

interface ChartData {
  id: number;
  name: string;
  role?: string;
  children?: ChartData[];
}

const options: YChartOptions = {
  nodeWidth: 220,
  nodeHeight: 110,
  editorTheme: 'light'
};
```

## Next Steps

- [Svelte Integration](./svelte) - Learn how to use YChart with Svelte
- [Vue Integration](./vue) - Learn how to use YChart with Vue
- [Custom Templates](../guides/custom-templates) - Create custom node templates
- [API Reference](../api/configuration) - Explore all configuration options
