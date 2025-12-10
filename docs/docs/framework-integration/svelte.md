---
sidebar_position: 3
---

# Svelte Integration

Learn how to integrate YChart into your Svelte application with proper lifecycle management and reactivity.

## Installation

```bash
npm install ychart-editor
# or
yarn add ychart-editor
# or
pnpm add ychart-editor
```

## Basic Component

Create a reusable Svelte component for YChart:

```svelte
<!-- YChart.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { YChartEditor } from 'ychart-editor';
  import 'ychart-editor/dist/style.css';

  export let yamlData: string;
  export let options = {
    nodeWidth: 220,
    nodeHeight: 110,
    editorTheme: 'light' as 'light' | 'dark'
  };

  let container: HTMLDivElement;
  let chart: YChartEditor | null = null;

  onMount(() => {
    chart = new YChartEditor(options);
    chart.initView(container, yamlData);
  });

  onDestroy(() => {
    chart = null;
  });

  // Reactive update when yamlData changes
  $: if (chart && yamlData) {
    chart.updateData(yamlData);
  }
</script>

<div bind:this={container} style="width: 100%; height: 100%;" />

<style>
  div {
    width: 100%;
    height: 100%;
  }
</style>
```

## Usage in App

```svelte
<!-- App.svelte -->
<script lang="ts">
  import YChart from './components/YChart.svelte';

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
</script>

<main>
  <YChart {yamlData} />
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
  }
</style>
```

## Advanced Component with Controls

```svelte
<!-- AdvancedYChart.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { YChartEditor } from 'ychart-editor';
  import 'ychart-editor/dist/style.css';

  export let initialData: string;

  let container: HTMLDivElement;
  let chart: YChartEditor | null = null;
  let currentView: 'org' | 'force' = 'org';
  let selectedNode: any = null;

  onMount(() => {
    chart = new YChartEditor({
      nodeWidth: 220,
      nodeHeight: 110,
      editorTheme: 'light'
    });

    chart
      .initView(container, initialData)
      .bgPatternStyle('dotted')
      .actionBtnPos('bottomleft', 'horizontal')
      .onNodeClick((node) => {
        selectedNode = node;
      });
  });

  onDestroy(() => {
    chart = null;
  });

  function switchView(view: 'org' | 'force') {
    if (chart) {
      if (view === 'org') {
        chart.switchToOrgView();
      } else {
        chart.switchToForceView();
      }
      currentView = view;
    }
  }

  function exportChart(format: 'svg' | 'png') {
    if (chart) {
      if (format === 'svg') {
        chart.exportSVG();
      } else {
        chart.exportPNG();
      }
    }
  }

  function toggleEditor() {
    chart?.toggleEditor();
  }
</script>

<div class="chart-wrapper">
  <!-- Control Panel -->
  <div class="controls">
    <div class="button-group">
      <button
        on:click={() => switchView('org')}
        disabled={currentView === 'org'}
        class:active={currentView === 'org'}
      >
        Org Chart
      </button>
      <button
        on:click={() => switchView('force')}
        disabled={currentView === 'force'}
        class:active={currentView === 'force'}
      >
        Force Graph
      </button>
    </div>
    <div class="button-group">
      <button on:click={toggleEditor} class="secondary">
        Toggle Editor
      </button>
      <button on:click={() => exportChart('svg')} class="export">
        Export SVG
      </button>
      <button on:click={() => exportChart('png')} class="export">
        Export PNG
      </button>
    </div>
  </div>

  <!-- Node Details Panel -->
  {#if selectedNode}
    <div class="details-panel">
      <h3>Node Details</h3>
      <p><strong>ID:</strong> {selectedNode.data.id}</p>
      <p><strong>Name:</strong> {selectedNode.data.name}</p>
      {#if selectedNode.data.role}
        <p><strong>Role:</strong> {selectedNode.data.role}</p>
      {/if}
      <button on:click={() => (selectedNode = null)}>Close</button>
    </div>
  {/if}

  <!-- Chart Container -->
  <div bind:this={container} class="chart-container" />
</div>

<style>
  .chart-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .chart-container {
    width: 100%;
    height: 100%;
  }

  .controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .button-group {
    margin-bottom: 10px;
  }

  .button-group:last-child {
    margin-bottom: 0;
  }

  button {
    margin-right: 5px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: #e0e0e0;
    color: black;
    cursor: pointer;
    font-size: 14px;
  }

  button:last-child {
    margin-right: 0;
  }

  button:hover:not(:disabled) {
    opacity: 0.8;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  button.active {
    background: #667eea;
    color: white;
  }

  button.secondary {
    background: #764ba2;
    color: white;
  }

  button.export {
    background: #4facfe;
    color: white;
  }

  .details-panel {
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 1000;
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    max-width: 300px;
  }

  .details-panel h3 {
    margin-top: 0;
  }

  .details-panel p {
    margin: 8px 0;
  }
</style>
```

## Reactive Data Updates

```svelte
<!-- ReactiveChart.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { YChartEditor } from 'ychart-editor';
  import 'ychart-editor/dist/style.css';

  let container: HTMLDivElement;
  let chart: YChartEditor | null = null;

  // Create a writable store for the data
  const chartData = writable(`
- id: 1
  name: CEO
  children:
    - id: 2
      name: CTO
  `);

  onMount(() => {
    chart = new YChartEditor();
    chart.initView(container, $chartData);

    // Subscribe to data changes
    const unsubscribe = chartData.subscribe((data) => {
      if (chart) {
        chart.updateData(data);
      }
    });

    return unsubscribe;
  });

  function addNode() {
    chartData.update((data) => {
      // Add a new node to the data
      const newId = Date.now();
      return data + `\n    - id: ${newId}\n      name: New Employee`;
    });
  }
</script>

<div class="wrapper">
  <button on:click={addNode}>Add Node</button>
  <div bind:this={container} class="chart" />
</div>

<style>
  .wrapper {
    width: 100%;
    height: 100vh;
  }

  .chart {
    width: 100%;
    height: calc(100% - 50px);
  }

  button {
    margin: 10px;
    padding: 10px 20px;
  }
</style>
```

## SvelteKit Integration

For SvelteKit projects, you may need to handle SSR:

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let YChart: any;
  let yamlData = `
- id: 1
  name: CEO
  children:
    - id: 2
      name: CTO
  `;

  onMount(async () => {
    if (browser) {
      // Dynamically import only on client side
      const module = await import('ychart-editor');
      YChart = module.YChartEditor;
    }
  });
</script>

<svelte:head>
  <title>YChart - SvelteKit</title>
</svelte:head>

{#if browser && YChart}
  <div id="chart-container">
    <!-- Use the component after it's loaded -->
  </div>
{:else}
  <div class="loading">Loading chart...</div>
{/if}

<style>
  #chart-container {
    width: 100vw;
    height: 100vh;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    font-size: 18px;
    color: #666;
  }
</style>
```

## Custom Store for Chart State

```typescript
// stores/chartStore.ts
import { writable } from 'svelte/store';

export interface ChartState {
  view: 'org' | 'force';
  editorVisible: boolean;
  selectedNode: any | null;
}

function createChartStore() {
  const { subscribe, set, update } = writable<ChartState>({
    view: 'org',
    editorVisible: true,
    selectedNode: null
  });

  return {
    subscribe,
    switchView: (view: 'org' | 'force') =>
      update((state) => ({ ...state, view })),
    toggleEditor: () =>
      update((state) => ({ ...state, editorVisible: !state.editorVisible })),
    selectNode: (node: any) =>
      update((state) => ({ ...state, selectedNode: node })),
    reset: () =>
      set({ view: 'org', editorVisible: true, selectedNode: null })
  };
}

export const chartStore = createChartStore();
```

```svelte
<!-- Using the store -->
<script lang="ts">
  import { chartStore } from './stores/chartStore';
  import YChart from './components/YChart.svelte';

  $: currentView = $chartStore.view;
</script>

<div>
  <button on:click={() => chartStore.switchView('org')}>Org View</button>
  <button on:click={() => chartStore.switchView('force')}>Force View</button>
  <button on:click={() => chartStore.toggleEditor()}>Toggle Editor</button>

  <p>Current view: {currentView}</p>

  <YChart yamlData="..." />
</div>
```

## TypeScript Support

For TypeScript projects, create type definitions:

```typescript
// types/ychart.d.ts
declare module 'ychart-editor' {
  export interface YChartOptions {
    nodeWidth?: number;
    nodeHeight?: number;
    editorTheme?: 'light' | 'dark';
  }

  export class YChartEditor {
    constructor(options?: YChartOptions);
    initView(container: HTMLElement | string, yamlData: string): this;
    updateData(yamlData: string): void;
    switchToOrgView(): void;
    switchToForceView(): void;
    exportSVG(): void;
    exportPNG(): void;
    toggleEditor(): void;
    bgPatternStyle(style: string): this;
    actionBtnPos(position: string, orientation: string): this;
    onNodeClick(callback: (node: any) => void): this;
  }
}
```

## Next Steps

- [Vue Integration](./vue) - Learn how to use YChart with Vue
- [Angular Integration](./angular) - Learn how to use YChart with Angular
- [Custom Templates](../guides/custom-templates) - Create custom node templates
- [API Reference](../api/configuration) - Explore all configuration options
