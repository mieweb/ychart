---
sidebar_position: 5
---

# Angular Integration

Learn how to integrate YChart into your Angular application with proper lifecycle management.

## Installation

```bash
npm install ychart-editor
# or
yarn add ychart-editor
# or
pnpm add ychart-editor
```

## Basic Component

Create a reusable Angular component for YChart:

```typescript
// ychart.component.ts
import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { YChartEditor } from 'ychart-editor';

@Component({
  selector: 'app-ychart',
  template: `
    <div #chartContainer style="width: 100%; height: 100%;"></div>
  `,
  styleUrls: ['./ychart.component.css']
})
export class YChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) containerRef!: ElementRef;
  @Input() yamlData!: string;
  @Input() options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    editorTheme?: 'light' | 'dark';
  };

  private chart: YChartEditor | null = null;

  ngOnInit(): void {
    this.chart = new YChartEditor(this.options);
    this.chart.initView(this.containerRef.nativeElement, this.yamlData);
  }

  ngOnDestroy(): void {
    this.chart = null;
  }
}
```

```css
/* ychart.component.css */
@import 'ychart-editor/dist/style.css';

:host {
  display: block;
  width: 100%;
  height: 100%;
}
```

## Usage in App Component

```typescript
// app.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div style="width: 100vw; height: 100vh;">
      <app-ychart [yamlData]="yamlData" [options]="chartOptions"></app-ychart>
    </div>
  `
})
export class AppComponent {
  yamlData = `
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

  chartOptions = {
    nodeWidth: 220,
    nodeHeight: 110,
    editorTheme: 'light' as const
  };
}
```

## Module Declaration

Don't forget to declare the component in your module:

```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { YChartComponent } from './components/ychart/ychart.component';

@NgModule({
  declarations: [
    AppComponent,
    YChartComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

## Advanced Component with Controls

```typescript
// advanced-ychart.component.ts
import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { YChartEditor } from 'ychart-editor';

@Component({
  selector: 'app-advanced-ychart',
  template: `
    <div class="chart-wrapper">
      <!-- Control Panel -->
      <div class="controls">
        <div class="button-group">
          <button
            (click)="switchView('org')"
            [disabled]="currentView === 'org'"
            [class.active]="currentView === 'org'"
          >
            Org Chart
          </button>
          <button
            (click)="switchView('force')"
            [disabled]="currentView === 'force'"
            [class.active]="currentView === 'force'"
          >
            Force Graph
          </button>
        </div>
        <div class="button-group">
          <button (click)="toggleEditor()" class="secondary">
            Toggle Editor
          </button>
          <button (click)="exportChart('svg')" class="export">
            Export SVG
          </button>
          <button (click)="exportChart('png')" class="export">
            Export PNG
          </button>
        </div>
      </div>

      <!-- Node Details Panel -->
      <div *ngIf="selectedNode" class="details-panel">
        <h3>Node Details</h3>
        <p><strong>ID:</strong> {{ selectedNode.data.id }}</p>
        <p><strong>Name:</strong> {{ selectedNode.data.name }}</p>
        <p *ngIf="selectedNode.data.role">
          <strong>Role:</strong> {{ selectedNode.data.role }}
        </p>
        <button (click)="selectedNode = null">Close</button>
      </div>

      <!-- Chart Container -->
      <div #chartContainer class="chart-container"></div>
    </div>
  `,
  styleUrls: ['./advanced-ychart.component.css']
})
export class AdvancedYChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) containerRef!: ElementRef;
  @Input() initialData!: string;

  chart: YChartEditor | null = null;
  currentView: 'org' | 'force' = 'org';
  selectedNode: any = null;

  ngOnInit(): void {
    this.chart = new YChartEditor({
      nodeWidth: 220,
      nodeHeight: 110,
      editorTheme: 'light'
    });

    this.chart
      .initView(this.containerRef.nativeElement, this.initialData)
      .bgPatternStyle('dotted')
      .actionBtnPos('bottomleft', 'horizontal')
      .onNodeClick((node: any) => {
        this.selectedNode = node;
      });
  }

  ngOnDestroy(): void {
    this.chart = null;
  }

  switchView(view: 'org' | 'force'): void {
    if (this.chart) {
      if (view === 'org') {
        this.chart.switchToOrgView();
      } else {
        this.chart.switchToForceView();
      }
      this.currentView = view;
    }
  }

  exportChart(format: 'svg' | 'png'): void {
    if (this.chart) {
      if (format === 'svg') {
        this.chart.exportSVG();
      } else {
        this.chart.exportPNG();
      }
    }
  }

  toggleEditor(): void {
    this.chart?.toggleEditor();
  }
}
```

```css
/* advanced-ychart.component.css */
@import 'ychart-editor/dist/style.css';

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
```

## Service-Based Approach

For better separation of concerns, create a service:

```typescript
// ychart.service.ts
import { Injectable } from '@angular/core';
import { YChartEditor } from 'ychart-editor';
import { BehaviorSubject, Observable } from 'rxjs';

export interface YChartState {
  view: 'org' | 'force';
  editorVisible: boolean;
  selectedNode: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class YChartService {
  private chart: YChartEditor | null = null;
  private stateSubject = new BehaviorSubject<YChartState>({
    view: 'org',
    editorVisible: true,
    selectedNode: null
  });

  public state$: Observable<YChartState> = this.stateSubject.asObservable();

  initialize(container: HTMLElement, yamlData: string, options?: any): void {
    this.chart = new YChartEditor(options);
    this.chart.initView(container, yamlData);
  }

  switchView(view: 'org' | 'force'): void {
    if (this.chart) {
      if (view === 'org') {
        this.chart.switchToOrgView();
      } else {
        this.chart.switchToForceView();
      }
      this.updateState({ view });
    }
  }

  toggleEditor(): void {
    this.chart?.toggleEditor();
    const currentState = this.stateSubject.value;
    this.updateState({ editorVisible: !currentState.editorVisible });
  }

  selectNode(node: any): void {
    this.updateState({ selectedNode: node });
  }

  exportSVG(): void {
    this.chart?.exportSVG();
  }

  exportPNG(): void {
    this.chart?.exportPNG();
  }

  destroy(): void {
    this.chart = null;
  }

  private updateState(partial: Partial<YChartState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial
    });
  }
}
```

### Using the Service

```typescript
// chart-with-service.component.ts
import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { YChartService } from './services/ychart.service';

@Component({
  selector: 'app-chart-with-service',
  template: `
    <div class="wrapper">
      <div class="controls">
        <button (click)="chartService.switchView('org')">Org View</button>
        <button (click)="chartService.switchView('force')">Force View</button>
        <button (click)="chartService.exportSVG()">Export SVG</button>
        <button (click)="chartService.exportPNG()">Export PNG</button>
      </div>
      <div #chartContainer class="chart"></div>
    </div>
  `,
  styleUrls: ['./chart-with-service.component.css']
})
export class ChartWithServiceComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) containerRef!: ElementRef;

  yamlData = `
- id: 1
  name: CEO
  children:
    - id: 2
      name: CTO
  `;

  constructor(public chartService: YChartService) {}

  ngOnInit(): void {
    this.chartService.initialize(
      this.containerRef.nativeElement,
      this.yamlData,
      {
        nodeWidth: 220,
        nodeHeight: 110,
        editorTheme: 'light'
      }
    );
  }

  ngOnDestroy(): void {
    this.chartService.destroy();
  }
}
```

## Standalone Component (Angular 14+)

For standalone components:

```typescript
// ychart-standalone.component.ts
import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YChartEditor } from 'ychart-editor';

@Component({
  selector: 'app-ychart-standalone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #chartContainer style="width: 100%; height: 100%;"></div>
  `,
  styles: [`
    @import 'ychart-editor/dist/style.css';
    
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class YChartStandaloneComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) containerRef!: ElementRef;
  @Input() yamlData!: string;
  @Input() options?: any;

  private chart: YChartEditor | null = null;

  ngOnInit(): void {
    this.chart = new YChartEditor(this.options);
    this.chart.initView(this.containerRef.nativeElement, this.yamlData);
  }

  ngOnDestroy(): void {
    this.chart = null;
  }
}
```

## TypeScript Configuration

Ensure your `tsconfig.json` allows synthetic default imports:

```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    // ... other options
  }
}
```

## Angular.json Configuration

If styles aren't loading, add to `angular.json`:

```json
{
  "projects": {
    "your-project": {
      "architect": {
        "build": {
          "options": {
            "styles": [
              "src/styles.css",
              "node_modules/ychart-editor/dist/style.css"
            ]
          }
        }
      }
    }
  }
}
```

## Change Detection

If you need to update data dynamically:

```typescript
import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';

export class YChartComponent implements OnInit, OnChanges {
  // ... existing code

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['yamlData'] && !changes['yamlData'].firstChange && this.chart) {
      this.chart.updateData(changes['yamlData'].currentValue);
    }
  }
}
```

## Next Steps

- [Custom Templates](../guides/custom-templates) - Create custom node templates
- [API Reference](../api/configuration) - Explore all configuration options
- [Examples](../examples/basic-org-chart) - See more examples
- [Vanilla JS Integration](./vanilla-js) - Alternative integration approach
