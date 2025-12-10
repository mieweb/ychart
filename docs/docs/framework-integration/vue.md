---
sidebar_position: 4
---

# Vue Integration

Learn how to integrate YChart into your Vue 3 application with the Composition API and proper lifecycle management.

## Installation

```bash
npm install ychart-editor
# or
yarn add ychart-editor
# or
pnpm add ychart-editor
```

## Basic Component (Composition API)

Create a reusable Vue component for YChart:

```vue
<!-- YChart.vue -->
<template>
  <div ref="containerRef" class="ychart-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { YChartEditor } from 'ychart-editor';
import 'ychart-editor/dist/style.css';

interface Props {
  yamlData: string;
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    editorTheme?: 'light' | 'dark';
  };
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({
    nodeWidth: 220,
    nodeHeight: 110,
    editorTheme: 'light'
  })
});

const emit = defineEmits<{
  nodeClick: [node: any];
}>();

const containerRef = ref<HTMLDivElement>();
let chart: YChartEditor | null = null;

onMounted(() => {
  if (containerRef.value) {
    chart = new YChartEditor(props.options);
    chart
      .initView(containerRef.value, props.yamlData)
      .onNodeClick((node) => {
        emit('nodeClick', node);
      });
  }
});

onUnmounted(() => {
  chart = null;
});

// Watch for data changes
watch(
  () => props.yamlData,
  (newData) => {
    if (chart && newData) {
      chart.updateData(newData);
    }
  }
);
</script>

<style scoped>
.ychart-container {
  width: 100%;
  height: 100%;
}
</style>
```

## Usage in App

```vue
<!-- App.vue -->
<template>
  <div class="app">
    <YChart :yaml-data="yamlData" :options="chartOptions" @node-click="handleNodeClick" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import YChart from './components/YChart.vue';

const yamlData = ref(`
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
`);

const chartOptions = {
  nodeWidth: 220,
  nodeHeight: 110,
  editorTheme: 'light' as const
};

const handleNodeClick = (node: any) => {
  console.log('Node clicked:', node);
};
</script>

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
}
</style>
```

## Advanced Component with Controls

```vue
<!-- AdvancedYChart.vue -->
<template>
  <div class="chart-wrapper">
    <!-- Control Panel -->
    <div class="controls">
      <div class="button-group">
        <button
          @click="switchView('org')"
          :disabled="currentView === 'org'"
          :class="{ active: currentView === 'org' }"
        >
          Org Chart
        </button>
        <button
          @click="switchView('force')"
          :disabled="currentView === 'force'"
          :class="{ active: currentView === 'force' }"
        >
          Force Graph
        </button>
      </div>
      <div class="button-group">
        <button @click="toggleEditor" class="secondary">Toggle Editor</button>
        <button @click="exportChart('svg')" class="export">Export SVG</button>
        <button @click="exportChart('png')" class="export">Export PNG</button>
      </div>
    </div>

    <!-- Node Details Panel -->
    <div v-if="selectedNode" class="details-panel">
      <h3>Node Details</h3>
      <p><strong>ID:</strong> {{ selectedNode.data.id }}</p>
      <p><strong>Name:</strong> {{ selectedNode.data.name }}</p>
      <p v-if="selectedNode.data.role">
        <strong>Role:</strong> {{ selectedNode.data.role }}
      </p>
      <button @click="selectedNode = null">Close</button>
    </div>

    <!-- Chart Container -->
    <div ref="containerRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { YChartEditor } from 'ychart-editor';
import 'ychart-editor/dist/style.css';

interface Props {
  initialData: string;
}

const props = defineProps<Props>();

const containerRef = ref<HTMLDivElement>();
const currentView = ref<'org' | 'force'>('org');
const selectedNode = ref<any>(null);

let chart: YChartEditor | null = null;

onMounted(() => {
  if (containerRef.value) {
    chart = new YChartEditor({
      nodeWidth: 220,
      nodeHeight: 110,
      editorTheme: 'light'
    });

    chart
      .initView(containerRef.value, props.initialData)
      .bgPatternStyle('dotted')
      .actionBtnPos('bottomleft', 'horizontal')
      .onNodeClick((node) => {
        selectedNode.value = node;
      });
  }
});

onUnmounted(() => {
  chart = null;
});

const switchView = (view: 'org' | 'force') => {
  if (chart) {
    if (view === 'org') {
      chart.switchToOrgView();
    } else {
      chart.switchToForceView();
    }
    currentView.value = view;
  }
};

const exportChart = (format: 'svg' | 'png') => {
  if (chart) {
    if (format === 'svg') {
      chart.exportSVG();
    } else {
      chart.exportPNG();
    }
  }
};

const toggleEditor = () => {
  chart?.toggleEditor();
};
</script>

<style scoped>
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

## Options API (Vue 2 Compatible)

```vue
<!-- YChartOptionsAPI.vue -->
<template>
  <div ref="container" class="ychart-container"></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { YChartEditor } from 'ychart-editor';
import 'ychart-editor/dist/style.css';

export default defineComponent({
  name: 'YChart',
  props: {
    yamlData: {
      type: String,
      required: true
    },
    options: {
      type: Object,
      default: () => ({
        nodeWidth: 220,
        nodeHeight: 110,
        editorTheme: 'light'
      })
    }
  },
  data() {
    return {
      chart: null as YChartEditor | null
    };
  },
  mounted() {
    this.chart = new YChartEditor(this.options);
    this.chart.initView(this.$refs.container as HTMLElement, this.yamlData);
  },
  beforeUnmount() {
    this.chart = null;
  },
  watch: {
    yamlData(newData) {
      if (this.chart && newData) {
        this.chart.updateData(newData);
      }
    }
  },
  methods: {
    exportSVG() {
      this.chart?.exportSVG();
    },
    exportPNG() {
      this.chart?.exportPNG();
    }
  }
});
</script>

<style scoped>
.ychart-container {
  width: 100%;
  height: 100%;
}
</style>
```

## Composable for Reusability

Create a composable for common YChart logic:

```typescript
// composables/useYChart.ts
import { ref, onMounted, onUnmounted, Ref } from 'vue';
import { YChartEditor } from 'ychart-editor';

interface UseYChartOptions {
  yamlData: string;
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    editorTheme?: 'light' | 'dark';
  };
}

export function useYChart(containerRef: Ref<HTMLElement | undefined>, config: UseYChartOptions) {
  const chart = ref<YChartEditor | null>(null);
  const isReady = ref(false);

  onMounted(() => {
    if (containerRef.value) {
      chart.value = new YChartEditor(config.options);
      chart.value.initView(containerRef.value, config.yamlData);
      isReady.value = true;
    }
  });

  onUnmounted(() => {
    chart.value = null;
    isReady.value = false;
  });

  const switchToOrgView = () => {
    chart.value?.switchToOrgView();
  };

  const switchToForceView = () => {
    chart.value?.switchToForceView();
  };

  const exportSVG = () => {
    chart.value?.exportSVG();
  };

  const exportPNG = () => {
    chart.value?.exportPNG();
  };

  const updateData = (newData: string) => {
    chart.value?.updateData(newData);
  };

  return {
    chart,
    isReady,
    switchToOrgView,
    switchToForceView,
    exportSVG,
    exportPNG,
    updateData
  };
}
```

### Using the Composable

```vue
<!-- ChartWithComposable.vue -->
<template>
  <div class="wrapper">
    <div v-if="isReady" class="controls">
      <button @click="switchToOrgView">Org View</button>
      <button @click="switchToForceView">Force View</button>
      <button @click="exportSVG">Export SVG</button>
      <button @click="exportPNG">Export PNG</button>
    </div>
    <div ref="containerRef" class="chart"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useYChart } from '@/composables/useYChart';

const containerRef = ref<HTMLElement>();

const yamlData = `
- id: 1
  name: CEO
  children:
    - id: 2
      name: CTO
`;

const { isReady, switchToOrgView, switchToForceView, exportSVG, exportPNG } = useYChart(
  containerRef,
  {
    yamlData,
    options: {
      nodeWidth: 220,
      nodeHeight: 110,
      editorTheme: 'light'
    }
  }
);
</script>

<style scoped>
.wrapper {
  width: 100%;
  height: 100vh;
}

.controls {
  padding: 10px;
}

.chart {
  width: 100%;
  height: calc(100% - 60px);
}
</style>
```

## Pinia Store Integration

```typescript
// stores/chartStore.ts
import { defineStore } from 'pinia';

export const useChartStore = defineStore('chart', {
  state: () => ({
    view: 'org' as 'org' | 'force',
    editorVisible: true,
    selectedNode: null as any
  }),
  actions: {
    switchView(view: 'org' | 'force') {
      this.view = view;
    },
    toggleEditor() {
      this.editorVisible = !this.editorVisible;
    },
    selectNode(node: any) {
      this.selectedNode = node;
    }
  }
});
```

## TypeScript Support

For better TypeScript support, create type definitions:

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

- [Angular Integration](./angular) - Learn how to use YChart with Angular
- [Custom Templates](../guides/custom-templates) - Create custom node templates
- [API Reference](../api/configuration) - Explore all configuration options
- [Examples](../examples/basic-org-chart) - See more examples
