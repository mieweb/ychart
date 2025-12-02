import { EditorView, basicSetup } from 'codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import * as jsyaml from 'js-yaml';
import { OrgChart } from './d3-org-chart.js';
import { ForceGraph } from './forceGraph.js';

interface YChartOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  childrenMargin?: number;
  compactMarginBetween?: number;
  compactMarginPair?: number;
  neighbourMargin?: number;
  editorTheme?: 'light' | 'dark';
  collapsible?: boolean;
  bgPatternStyle?: 'dotted' | 'dashed';
  patternColor?: string;
  toolbarPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'topcenter' | 'bottomcenter';
  toolbarOrientation?: 'horizontal' | 'vertical';
}

interface FieldSchema {
  type: string;
  required: boolean;
  missing: boolean;
}

interface SchemaDefinition {
  [fieldName: string]: FieldSchema;
}

interface CardElement {
  [tagName: string]: string | CardConfig;
}

interface CardConfig {
  class?: string;
  content?: string;
  style?: string;
  children?: CardElement[];
}

interface FrontMatter {
  options: YChartOptions;
  schema: SchemaDefinition;
  card?: CardElement[];
  data: string;
}

class YChartEditor {
  private viewContainer: HTMLElement | null = null;
  private editorContainer: HTMLElement | null = null;
  private chartContainer: HTMLElement | null = null;
  private editor: EditorView | null = null;
  private orgChart: any = null;
  private forceGraph: ForceGraph | null = null;
  private currentView: 'hierarchy' | 'force' = 'hierarchy';
  private swapModeEnabled = false;
  private isUpdatingProgrammatically = false;
  private defaultOptions: YChartOptions;
  private initialData: string = '';
  private detailsPanel: HTMLElement | null = null;
  private bgPattern: 'dotted' | 'dashed' | undefined = undefined;
  private toolbar: HTMLElement | null = null;
  private toolbarPosition: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'topcenter' | 'bottomcenter' = 'bottomleft';
  private toolbarOrientation: 'horizontal' | 'vertical' = 'horizontal';
  private customTemplate: ((d: any, schema: SchemaDefinition) => string) | null = null;
  private currentSchema: SchemaDefinition = {};
  private cardTemplate: CardElement[] | null = null;
  private columnAdjustMode = false;
  private columnAdjustButtons: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private supervisorFields: string[] = ['supervisor', 'reports', 'reports_to', 'manager', 'leader', 'parent'];
  private nameField: string = 'name';
  
  constructor(options?: YChartOptions) {
    this.defaultOptions = {
      nodeWidth: 220,
      nodeHeight: 110,
      childrenMargin: 50,
      compactMarginBetween: 35,
      compactMarginPair: 30,
      neighbourMargin: 20,
      editorTheme: 'dark',
      collapsible: true,
      toolbarPosition: 'bottomleft',
      toolbarOrientation: 'horizontal',
      ...options
    };

    // Set toolbar position and orientation from options
    this.toolbarPosition = this.defaultOptions.toolbarPosition!;
    this.toolbarOrientation = this.defaultOptions.toolbarOrientation!;
  }

  /**
   * Initialize the view with a container element
   */
  initView(containerIdOrElement: string | HTMLElement, yamlData: string): this {
    // Get the main container
    this.viewContainer = typeof containerIdOrElement === 'string'
      ? document.getElementById(containerIdOrElement)
      : containerIdOrElement;

    if (!this.viewContainer) {
      throw new Error(`Container not found: ${containerIdOrElement}`);
    }

    this.initialData = yamlData;

    // Create the layout structure
    this.createLayout();
    
    // Initialize the editor
    this.initializeEditor();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Render initial chart
    this.renderChart();

    // Auto-collapse editor after 1 second to ensure proper initialization
    this.toggleEditor();
    // setTimeout(() => {
    // }, 10);

    return this;
  
}
  private createLayout(): void {
    if (!this.viewContainer) return;

    // Clear container
    this.viewContainer.innerHTML = '';
    this.viewContainer.style.cssText = 'display:flex;width:100%;height:100%;position:relative;';

    // Create chart container (now on left side)
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'ychart-chart-wrapper';
    chartWrapper.style.cssText = 'flex:1;height:100%;position:relative;display:flex;flex-direction:column;overflow:hidden;';

    this.chartContainer = document.createElement('div');
    this.chartContainer.id = 'ychart-chart';
    this.chartContainer.className = 'ychart-chart-container';
    this.chartContainer.style.cssText = 'flex:1;width:100%;height:100%;position:relative;';
    chartWrapper.appendChild(this.chartContainer);

    // Create details panel
    this.detailsPanel = document.createElement('div');
    this.detailsPanel.id = 'ychart-node-details';
    this.detailsPanel.className = 'ychart-details-panel';
    this.detailsPanel.style.cssText = `
      display: none;
      position: absolute;
      right: 20px;
      top: 20px;
      background: white;
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 400px;
      max-height: 80%;
      overflow-y: auto;
      z-index: 100;
    `;
    chartWrapper.appendChild(this.detailsPanel);

    // Create toolbar
    this.toolbar = this.createToolbar();
    chartWrapper.appendChild(this.toolbar);

    // Create editor sidebar (now on right side, open by default)
    const editorSidebar = document.createElement('div');
    editorSidebar.id = 'ychart-editor-sidebar';
    editorSidebar.className = 'ychart-editor-sidebar';
    editorSidebar.style.cssText = `
      width: 400px;
      height: 100%;
      border-left: 1px solid #ccc;
      overflow: hidden;
      position: relative;
      transition: width 0.3s ease, border-left-width 0s 0.3s;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    `;

    // Create error banner container (above editor)
    this.errorBanner = document.createElement('div');
    this.errorBanner.id = 'ychart-error-banner';
    this.errorBanner.className = 'ychart-error-banner';
    this.errorBanner.style.cssText = `
      display: none;
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border-bottom: 2px solid #ef4444;
      padding: 8px 12px;
      max-height: 120px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
    `;
    editorSidebar.appendChild(this.errorBanner);

    // Create editor container
    this.editorContainer = document.createElement('div');
    this.editorContainer.id = 'ychart-editor';
    this.editorContainer.className = 'ychart-editor-container';
    this.editorContainer.style.cssText = 'width:100%;height:100%;flex:1;overflow:hidden;';
    editorSidebar.appendChild(this.editorContainer);

    // Create collapse button (positioned outside sidebar, on the left side of editor)
    if (this.defaultOptions.collapsible) {
      const collapseBtn = document.createElement('button');
      collapseBtn.id = 'ychart-collapse-editor';
      collapseBtn.className = 'ychart-collapse-btn';
      collapseBtn.innerHTML = '▶';
      collapseBtn.style.cssText = `
        position: absolute;
        right: 399px;
        top: 10px;
        z-index: 1001;
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 6px;
        cursor: pointer;
        border-radius: 4px 0 0 4px;
        font-size: 12px;
        transition: right 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      collapseBtn.onclick = () => this.toggleEditor();
      this.viewContainer.appendChild(collapseBtn);
    }

    // Append to main container (chart first, then editor)
    this.viewContainer.appendChild(chartWrapper);
    this.viewContainer.appendChild(editorSidebar);
  }

  private getToolbarPositionStyles(): string {
    const margin = '20px';
    
    switch (this.toolbarPosition) {
      case 'topleft':
        return `top: ${margin}; left: ${margin};`;
      case 'topright':
        return `top: ${margin}; right: ${margin};`;
      case 'bottomleft':
        return `bottom: ${margin}; left: ${margin};`;
      case 'bottomright':
        return `bottom: ${margin}; right: ${margin};`;
      case 'topcenter':
        return `top: ${margin}; left: 50%; transform: translateX(-50%);`;
      case 'bottomcenter':
        return `bottom: ${margin}; left: 50%; transform: translateX(-50%);`;
      default:
        return `bottom: ${margin}; left: ${margin};`;
    }
  }

  private getTooltipPosition(): string {
    const isVertical = this.toolbarOrientation === 'vertical';
    
    // For vertical toolbars, show tooltip to the side
    if (isVertical) {
      // If toolbar is on the left side, show tooltip to the right
      if (this.toolbarPosition.includes('left')) {
        return `left: calc(100% + 8px); top: 50%; transform: translateY(-50%) scale(0.8);`;
      }
      // If toolbar is on the right side, show tooltip to the left
      return `right: calc(100% + 8px); top: 50%; transform: translateY(-50%) scale(0.8);`;
    }
    
    // For horizontal toolbars, show tooltip above or below
    // If toolbar is at the top, show tooltip below
    if (this.toolbarPosition.includes('top')) {
      return `top: calc(100% + 8px); left: 50%; transform: translateX(-50%) scale(0.8);`;
    }
    
    // If toolbar is at the bottom, show tooltip above
    return `bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) scale(0.8);`;
  }

  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.id = 'ychart-toolbar';
    toolbar.className = 'ychart-toolbar';
    
    // Calculate position styles
    const positionStyles = this.getToolbarPositionStyles();
    const orientation = this.toolbarOrientation === 'vertical' ? 'column' : 'row';
    
    toolbar.style.cssText = `
      position: absolute;
      ${positionStyles}
      display: flex;
      flex-direction: ${orientation};
      gap: 8px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 50;
      border: 1px solid rgba(0, 0, 0, 0.1);
    `;

    // Icon definitions
    const icons = {
      reset: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`,
      fit: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
      export: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 15V3"/></svg>`,
      swap: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l4 4-4 4M8 21l-4-4 4-4M20 7H4M4 17h16"/></svg>`,
      forceGraph: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><line x1="12" y1="7" x2="12" y2="10"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="14" y1="12" x2="17" y2="12"/><line x1="7" y1="12" x2="10" y2="12"/></svg>`,
      orgChart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
      expandAll: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
      collapseAll: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
      columnAdjust: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/><line x1="6.5" y1="8" x2="6.5" y2="16"/><line x1="17.5" y1="8" x2="17.5" y2="16"/></svg>`,
    };

    // Button configurations
    const buttons = [
      { id: 'fit', icon: icons.fit, tooltip: 'Fit to Screen', action: () => this.handleFit() },
      { id: 'reset', icon: icons.reset, tooltip: 'Reset Position', action: () => this.handleReset() },
      { id: 'expandAll', icon: icons.expandAll, tooltip: 'Expand All', action: () => this.handleExpandAll() },
      { id: 'collapseAll', icon: icons.collapseAll, tooltip: 'Collapse All', action: () => this.handleCollapseAll() },
      { id: 'columnAdjust', icon: icons.columnAdjust, tooltip: 'Adjust Child Columns', action: () => this.handleColumnAdjustToggle() },
      { id: 'swap', icon: icons.swap, tooltip: 'Swap Mode', action: () => this.handleSwapToggle() },
      { id: 'toggleView', icon: this.currentView === 'hierarchy' ? icons.forceGraph : icons.orgChart, tooltip: this.currentView === 'hierarchy' ? 'Switch to Force Graph' : 'Switch to Org Chart', action: () => this.handleToggleView() },
      { id: 'export', icon: icons.export, tooltip: 'Export SVG', action: () => this.handleExport() },
    ];

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.id = `ychart-btn-${btn.id}`;
      button.className = `ychart-toolbar-btn ychart-btn-${btn.id}`;
      button.innerHTML = btn.icon;
      button.setAttribute('data-tooltip', btn.tooltip);
      button.style.cssText = `
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        background: transparent;
        color: #4a5568;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s ease;
        padding: 0;
      `;

      // Create tooltip label
      const tooltip = document.createElement('span');
      tooltip.className = 'ychart-tooltip';
      tooltip.textContent = btn.tooltip;
      
      // Calculate tooltip position based on toolbar orientation
      const tooltipPosition = this.getTooltipPosition();
      
      tooltip.style.cssText = `
        position: absolute;
        ${tooltipPosition}
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      `;
      
      button.appendChild(tooltip);

      button.onmouseenter = () => {
        button.style.background = '#667eea';
        button.style.color = 'white';
        button.style.transform = 'translateY(-2px)';
        
        // Show tooltip with animation - adjust transform based on position
        tooltip.style.opacity = '1';
        const isVertical = this.toolbarOrientation === 'vertical';
        if (isVertical) {
          if (this.toolbarPosition.includes('left')) {
            tooltip.style.transform = 'translateY(-50%) scale(1)';
          } else {
            tooltip.style.transform = 'translateY(-50%) scale(1)';
          }
        } else {
          tooltip.style.transform = 'translateX(-50%) scale(1)';
        }
      };

      button.onmouseleave = () => {
        if (btn.id === 'swap' && this.swapModeEnabled) {
          button.style.background = '#e74c3c';
          button.style.color = 'white';
        } else if (btn.id === 'columnAdjust' && this.columnAdjustMode) {
          button.style.background = '#9b59b6';
          button.style.color = 'white';
        } else {
          button.style.background = 'transparent';
          button.style.color = '#4a5568';
        }
        button.style.transform = 'translateY(0)';
        
        // Hide tooltip with animation - restore initial transform
        tooltip.style.opacity = '0';
        const isVertical = this.toolbarOrientation === 'vertical';
        if (isVertical) {
          if (this.toolbarPosition.includes('left')) {
            tooltip.style.transform = 'translateY(-50%) scale(0.8)';
          } else {
            tooltip.style.transform = 'translateY(-50%) scale(0.8)';
          }
        } else {
          tooltip.style.transform = 'translateX(-50%) scale(0.8)';
        }
      };

      button.onclick = btn.action;
      toolbar.appendChild(button);
    });

    return toolbar;
  }

  private handleFit(): void {
    if (this.orgChart) {
      this.orgChart.fit();
    }
  }

  private handleReset(): void {
    this.renderChart();
  }

  private handleSwapToggle(): void {
    if (!this.orgChart) return;

    this.swapModeEnabled = !this.swapModeEnabled;

    if (typeof this.orgChart.enableSwapMode === 'function') {
      this.orgChart.enableSwapMode(this.swapModeEnabled);
    }

    if (typeof this.orgChart.onNodeSwap === 'function') {
      this.orgChart.onNodeSwap((data1: any, data2: any) => {
        this.updateYAMLAfterSwap(data1, data2);
      });
    }

    // Update button style
    const swapBtn = document.getElementById('ychart-btn-swap');
    if (swapBtn) {
      if (this.swapModeEnabled) {
        swapBtn.style.background = '#e74c3c';
        swapBtn.style.color = 'white';
      } else {
        swapBtn.style.background = 'transparent';
        swapBtn.style.color = '#4a5568';
      }
    }
  }

  private handleToggleView(): void {
    if (this.currentView === 'hierarchy') {
      this.renderForceGraph();
    } else {
      this.renderChart();
    }

    // Update the toggle view button icon and tooltip
    const toggleBtn = document.getElementById('ychart-btn-toggleView');
    if (toggleBtn) {
      const icons = {
        forceGraph: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><line x1="12" y1="7" x2="12" y2="10"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="14" y1="12" x2="17" y2="12"/><line x1="7" y1="12" x2="10" y2="12"/></svg>`,
        orgChart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
      };

      if (this.currentView === 'hierarchy') {
        toggleBtn.innerHTML = icons.forceGraph;
        toggleBtn.title = 'Switch to Force Graph';
      } else {
        toggleBtn.innerHTML = icons.orgChart;
        toggleBtn.title = 'Switch to Org Chart';
      }
    }
  }

  private handleExport(): void {
    if (this.orgChart && typeof this.orgChart.exportSvg === 'function') {
      this.orgChart.exportSvg();
    }
  }

  private handleExpandAll(): void {
    if (this.orgChart && typeof this.orgChart.expandAll === 'function') {
      this.orgChart.expandAll();
      this.orgChart.render();
      setTimeout(() => {
        if (this.orgChart) {
          this.orgChart.fit();
        }
      }, 200);
    }
  }

  private handleCollapseAll(): void {
    if (this.orgChart && typeof this.orgChart.collapseAll === 'function') {
      this.orgChart.collapseAll();
      this.orgChart.render();
      setTimeout(() => {
        if (this.orgChart) {
          this.orgChart.fit();
        }
      }, 200);
    }
  }



  private handleColumnAdjustToggle(): void {
    if (!this.orgChart) return;

    this.columnAdjustMode = !this.columnAdjustMode;

    // Update button style
    const columnAdjustBtn = document.getElementById('ychart-btn-columnAdjust');
    if (columnAdjustBtn) {
      if (this.columnAdjustMode) {
        columnAdjustBtn.style.background = '#9b59b6';
        columnAdjustBtn.style.color = 'white';
        console.log('Column adjust mode enabled. Click a parent node to adjust its children column layout.');
      } else {
        columnAdjustBtn.style.background = 'transparent';
        columnAdjustBtn.style.color = '#4a5568';
        this.hideColumnAdjustButtons();
        console.log('Column adjust mode disabled.');
      }
    }
  }

  private handleNodeClickForColumnAdjust(nodeData: any): void {
    if (!this.columnAdjustMode || !this.chartContainer) return;

    // Check if node has children
    const childrenCount = (nodeData.children?.length || 0) + (nodeData._children?.length || 0);
    if (childrenCount === 0) {
      console.log('This node has no children to arrange.');
      return;
    }

    // Get current column count or default to 2
    const currentColumns = nodeData.data._childColumns || 2;
    
    console.log(`Selected node with ${childrenCount} children. Current columns: ${currentColumns}`);
    
    // Show column adjustment buttons
    this.showColumnAdjustButtons(nodeData, currentColumns, childrenCount);
  }

  private showColumnAdjustButtons(nodeData: any, currentColumns: number, childrenCount: number): void {
    // Remove existing buttons if any
    this.hideColumnAdjustButtons();

    // Create column adjust controls
    this.columnAdjustButtons = document.createElement('div');
    this.columnAdjustButtons.id = 'ychart-column-adjust-controls';
    this.columnAdjustButtons.className = 'ychart-column-adjust-controls';
    this.columnAdjustButtons.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 100;
      border: 2px solid #9b59b6;
      min-width: 300px;
    `;

    const title = document.createElement('div');
    title.className = 'ychart-column-adjust-title';
    title.textContent = `Adjust Children Columns`;
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #2c3e50;
      text-align: center;
    `;
    this.columnAdjustButtons.appendChild(title);

    const info = document.createElement('div');
    info.className = 'ychart-column-adjust-info';
    info.textContent = `Node: ${nodeData.data.name || nodeData.data.id} (${childrenCount} children)`;
    info.style.cssText = `
      font-size: 13px;
      color: #7f8c8d;
      margin-bottom: 15px;
      text-align: center;
    `;
    this.columnAdjustButtons.appendChild(info);

    // Column controls
    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'ychart-column-controls-wrapper';
    controlsWrapper.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-bottom: 15px;
    `;

    const decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'ychart-column-decrease-btn';
    decreaseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    decreaseBtn.disabled = currentColumns <= 2;
    decreaseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      background: ${currentColumns <= 2 ? '#ecf0f1' : '#9b59b6'};
      color: white;
      border-radius: 8px;
      cursor: ${currentColumns <= 2 ? 'not-allowed' : 'pointer'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    if (currentColumns > 2) {
      decreaseBtn.onmouseover = () => decreaseBtn.style.background = '#8e44ad';
      decreaseBtn.onmouseleave = () => decreaseBtn.style.background = '#9b59b6';
      decreaseBtn.onclick = () => this.adjustNodeColumns(nodeData, currentColumns - 1);
    }

    const columnDisplay = document.createElement('div');
    columnDisplay.className = 'ychart-column-display';
    columnDisplay.textContent = `${currentColumns} Columns`;
    columnDisplay.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      min-width: 100px;
      text-align: center;
    `;

    const increaseBtn = document.createElement('button');
    increaseBtn.className = 'ychart-column-increase-btn';
    increaseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    increaseBtn.disabled = currentColumns >= childrenCount;
    increaseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      background: ${currentColumns >= childrenCount ? '#ecf0f1' : '#9b59b6'};
      color: white;
      border-radius: 8px;
      cursor: ${currentColumns >= childrenCount ? 'not-allowed' : 'pointer'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    if (currentColumns < childrenCount) {
      increaseBtn.onmouseover = () => increaseBtn.style.background = '#8e44ad';
      increaseBtn.onmouseleave = () => increaseBtn.style.background = '#9b59b6';
      increaseBtn.onclick = () => this.adjustNodeColumns(nodeData, currentColumns + 1);
    }

    controlsWrapper.appendChild(decreaseBtn);
    controlsWrapper.appendChild(columnDisplay);
    controlsWrapper.appendChild(increaseBtn);
    this.columnAdjustButtons.appendChild(controlsWrapper);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ychart-column-close-btn';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      border: none;
      background: #95a5a6;
      color: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#7f8c8d';
    closeBtn.onmouseleave = () => closeBtn.style.background = '#95a5a6';
    closeBtn.onclick = () => this.hideColumnAdjustButtons();
    this.columnAdjustButtons.appendChild(closeBtn);

    this.chartContainer?.appendChild(this.columnAdjustButtons);
  }

  private hideColumnAdjustButtons(): void {
    if (this.columnAdjustButtons && this.columnAdjustButtons.parentNode) {
      this.columnAdjustButtons.parentNode.removeChild(this.columnAdjustButtons);
      this.columnAdjustButtons = null;
    }
  }

  private adjustNodeColumns(nodeData: any, newColumns: number): void {
    // Store column preference on node data
    nodeData.data._childColumns = newColumns;
    
    console.log(`Adjusted columns to ${newColumns} for node:`, nodeData.data.id);
    
    // Re-render the chart with new column layout
    if (this.orgChart) {
      this.orgChart.render();
      
      setTimeout(() => {
        if (this.orgChart) {
          this.orgChart.fit();
        }
      }, 200);
    }
    
    // Close the column adjust panel
    this.hideColumnAdjustButtons();
  }

  private initializeEditor(): void {
    if (!this.editorContainer) return;

    // Create YAML linter that validates syntax and structure
    const yamlLinter = linter((view) => {
      const diagnostics: Diagnostic[] = [];
      const content = view.state.doc.toString();
      
      try {
        // Parse the full content (front matter + data)
        const { data: yamlData } = this.parseFrontMatter(content);
        const parsed = jsyaml.load(yamlData);
        
        // Validate that the data is an array
        if (parsed !== null && parsed !== undefined && !Array.isArray(parsed)) {
          // Find the start of the data section (after front matter)
          const dataStart = content.lastIndexOf('---');
          const pos = dataStart !== -1 ? dataStart + 3 : 0;
          
          diagnostics.push({
            from: pos,
            to: Math.min(pos + 50, content.length),
            severity: 'error',
            message: 'YAML data must be an array of objects (start each item with "- ")'
          });
        } else if (Array.isArray(parsed)) {
          // Validate parent-child relationships
          // Build set of valid IDs: explicit IDs + emails (as potential auto-generated IDs)
          const nodeIds = new Set<string>();
          for (const item of parsed as any[]) {
            if (item.id !== undefined && item.id !== null) {
              nodeIds.add(String(item.id));
            }
            // Also add email as a valid ID (since it can be auto-generated)
            if (item.email) {
              nodeIds.add(String(item.email).toLowerCase());
            }
          }
          
          // Check for missing/invalid parentId references
          for (const item of parsed as any[]) {
            const parentId = item.parentId;
            // parentId should be null for root, or reference an existing node (by id or email)
            if (parentId !== null && parentId !== undefined && !nodeIds.has(String(parentId)) && !nodeIds.has(String(parentId).toLowerCase())) {
              // Find the line with this item's parentId
              const itemIdPattern = new RegExp(`^-\\s*id:\\s*${item.id}\\s*$`, 'm');
              const parentIdPattern = new RegExp(`parentId:\\s*${parentId}`, 'm');
              
              // Find the parentId line for this item
              const itemMatch = content.match(itemIdPattern);
              let errorPos = 0;
              let errorEnd = content.length;
              
              if (itemMatch && itemMatch.index !== undefined) {
                // Look for parentId after this item's id
                const afterId = content.substring(itemMatch.index);
                const parentIdMatch = afterId.match(parentIdPattern);
                if (parentIdMatch && parentIdMatch.index !== undefined) {
                  errorPos = itemMatch.index + parentIdMatch.index;
                  errorEnd = errorPos + parentIdMatch[0].length;
                }
              }
              
              // Calculate line number for the error message
              const lineNumber = content.substring(0, errorPos).split('\n').length;
              
              diagnostics.push({
                from: errorPos,
                to: errorEnd,
                severity: 'error',
                message: `Line ${lineNumber}: Invalid parentId "${parentId}" - no node with this id exists`
              });
            }
          }
        }
      } catch (e: unknown) {
        if (e instanceof jsyaml.YAMLException) {
          // js-yaml provides mark with line and column info
          const mark = e.mark;
          if (mark) {
            // Convert line/column to document position
            const line = Math.min(mark.line + 1, view.state.doc.lines);
            const lineInfo = view.state.doc.line(line);
            const from = lineInfo.from + Math.min(mark.column, lineInfo.length);
            const to = lineInfo.to;
            
            diagnostics.push({
              from,
              to,
              severity: 'error',
              message: `Line ${line}: ${e.reason || e.message}`
            });
          } else {
            // Fallback if no mark is available
            diagnostics.push({
              from: 0,
              to: Math.min(50, content.length),
              severity: 'error',
              message: e.message
            });
          }
        } else if (e instanceof Error) {
          diagnostics.push({
            from: 0,
            to: Math.min(50, content.length),
            severity: 'error',
            message: e.message
          });
        }
      }
      
      // Update the error banner with all diagnostics
      this.updateErrorBanner(diagnostics, view);
      
      return diagnostics;
    }, { delay: 300 });

    const extensions = [
      basicSetup,
      yaml(),
      lintGutter(),
      yamlLinter,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !this.isUpdatingProgrammatically) {
          this.renderChart();
        }
      })
    ];

    if (this.defaultOptions.editorTheme === 'dark') {
      extensions.push(oneDark);
    }

    // Make CodeMirror fill height and handle its own scrolling
    extensions.push(
      EditorView.theme({
        "&": { 
          height: "100%"
        },
        ".cm-scroller": { 
          overflow: "auto"
        }
      })
    );

    this.editor = new EditorView({
      doc: this.initialData,
      extensions,
      parent: this.editorContainer
    });
    
    // Force CodeMirror to refresh after a short delay to ensure proper rendering
    setTimeout(() => {
      if (this.editor) {
        this.editor.requestMeasure();
      }
    }, 100);
  }

  /**
   * Update the error banner with current diagnostics
   */
  private updateErrorBanner(diagnostics: Diagnostic[], view: EditorView): void {
    if (!this.errorBanner) return;

    const errors = diagnostics.filter(d => d.severity === 'error');
    const warnings = diagnostics.filter(d => d.severity === 'warning');
    const banner = this.errorBanner; // Capture for TypeScript

    if (errors.length === 0 && warnings.length === 0) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'block';
    banner.innerHTML = '';

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-weight: 600;
      color: #b91c1c;
    `;
    header.innerHTML = `
      <span style="font-size: 16px;">⚠️</span>
      <span>${errors.length} error${errors.length !== 1 ? 's' : ''}${warnings.length > 0 ? `, ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}` : ''}</span>
    `;
    banner.appendChild(header);

    // Create error list
    const allDiagnostics = [...errors, ...warnings];
    allDiagnostics.forEach((diagnostic, index) => {
      const errorItem = document.createElement('div');
      errorItem.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 4px 0;
        ${index < allDiagnostics.length - 1 ? 'border-bottom: 1px solid rgba(239, 68, 68, 0.2);' : ''}
      `;

      // Extract line number from message or calculate it
      const lineMatch = diagnostic.message.match(/^Line (\d+):/);
      let lineNumber: number;
      let displayMessage: string;
      
      if (lineMatch) {
        lineNumber = parseInt(lineMatch[1], 10);
        displayMessage = diagnostic.message.replace(/^Line \d+:\s*/, '');
      } else {
        // Calculate line from position
        const doc = view.state.doc;
        lineNumber = doc.lineAt(diagnostic.from).number;
        displayMessage = diagnostic.message;
      }

      // Create jump button
      const jumpBtn = document.createElement('button');
      jumpBtn.textContent = `L${lineNumber}`;
      jumpBtn.title = `Jump to line ${lineNumber}`;
      jumpBtn.style.cssText = `
        background: ${diagnostic.severity === 'error' ? '#dc2626' : '#d97706'};
        color: white;
        border: none;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        flex-shrink: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      `;
      jumpBtn.onmouseover = () => {
        jumpBtn.style.background = diagnostic.severity === 'error' ? '#b91c1c' : '#b45309';
      };
      jumpBtn.onmouseleave = () => {
        jumpBtn.style.background = diagnostic.severity === 'error' ? '#dc2626' : '#d97706';
      };
      jumpBtn.onclick = () => {
        this.jumpToLine(lineNumber);
      };

      // Create message text
      const messageSpan = document.createElement('span');
      messageSpan.textContent = displayMessage;
      messageSpan.style.cssText = `
        color: #7f1d1d;
        flex: 1;
        word-break: break-word;
      `;

      errorItem.appendChild(jumpBtn);
      errorItem.appendChild(messageSpan);
      banner.appendChild(errorItem);
    });
  }

  /**
   * Jump to a specific line in the editor
   */
  private jumpToLine(lineNumber: number): void {
    if (!this.editor) return;

    const doc = this.editor.state.doc;
    const line = doc.line(Math.min(lineNumber, doc.lines));
    
    // Set cursor to the start of the line and scroll it into view
    this.editor.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true,
      effects: EditorView.scrollIntoView(line.from, { y: 'center' })
    });

    // Focus the editor
    this.editor.focus();
  }

  private toggleEditor(): void {
    const sidebar = document.getElementById('ychart-editor-sidebar');
    const collapseBtn = document.getElementById('ychart-collapse-editor');
    
    if (!sidebar || !collapseBtn) return;

    const isCollapsed = sidebar.style.width === '0px';
    
    if (isCollapsed) {
      // Expand
      sidebar.style.width = '400px';
      sidebar.style.borderLeftWidth = '1px';
      sidebar.style.transition = 'width 0.3s ease, border-left-width 0s 0s';
      collapseBtn.style.right = '399px';
      collapseBtn.innerHTML = '▶';
      
      // Force CodeMirror to refresh after expansion animation
      setTimeout(() => {
        if (this.editor) {
          this.editor.requestMeasure();
        }
      }, 350);
    } else {
      // Collapse
      sidebar.style.width = '0px';
      sidebar.style.borderLeftWidth = '0px';
      sidebar.style.transition = 'width 0.3s ease, border-left-width 0s 0.3s';
      collapseBtn.style.right = '-1px';
      collapseBtn.innerHTML = '◀';
    }
    
    // Force chart to recalculate SVG dimensions after toggle animation completes
    setTimeout(() => {
      if (this.orgChart && this.chartContainer) {
        console.log('Re-rendering and fitting chart to new container bounds...');
        // Force SVG to update by calling render then fit
        this.orgChart.render().fit();
      }
    }, 250);
  }

  /**
   * Set up keyboard shortcuts for the editor
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Ctrl + ` (backtick) to toggle editor and find selected node
      if (event.ctrlKey && event.key === '`') {
        event.preventDefault();
        this.toggleEditorAndFindSelectedNode();
      }
    });
  }

  /**
   * Toggle the editor panel and scroll to the currently selected node
   */
  private toggleEditorAndFindSelectedNode(): void {
    const sidebar = document.getElementById('ychart-editor-sidebar');
    if (!sidebar) return;

    const isCollapsed = sidebar.style.width === '0px';
    
    // Toggle the editor
    this.toggleEditor();
    
    // If we're opening the editor, find and scroll to the selected node
    if (isCollapsed) {
      // Wait for the editor to expand before scrolling
      setTimeout(() => {
        this.scrollToSelectedNode();
      }, 400);
    }
  }

  /**
   * Find the currently selected node in the YAML and scroll to it in the editor
   */
  private scrollToSelectedNode(): void {
    if (!this.editor || !this.orgChart) return;

    // Get the selected node ID from the org chart
    const chartState = this.orgChart.getChartState();
    const selectedNodeId = chartState?.selectedNodeId;
    
    if (!selectedNodeId) {
      console.log('No node selected');
      return;
    }

    console.log('Finding node with ID:', selectedNodeId);

    const content = this.editor.state.doc.toString();
    
    // Find the position of the node entry in YAML
    // Look for patterns like "- id: 5" or "  id: 5" at the start of a line
    const idPattern = new RegExp(`^-?\\s*id:\\s*${selectedNodeId}\\s*$`, 'm');
    const match = content.match(idPattern);
    
    if (match && match.index !== undefined) {
      // Find the start of the YAML block (look backwards for "- id:" pattern)
      let blockStart = match.index;
      
      // Look backwards to find the start of the list item (the "- " before id)
      const beforeMatch = content.substring(0, match.index);
      const lastDash = beforeMatch.lastIndexOf('\n- ');
      if (lastDash !== -1) {
        blockStart = lastDash + 1; // +1 to skip the newline
      }

      // Calculate the line number
      const lineNumber = content.substring(0, blockStart).split('\n').length;
      
      // Scroll to the line and highlight it
      const line = this.editor.state.doc.line(lineNumber);
      
      this.editor.dispatch({
        selection: { anchor: line.from, head: line.to },
        scrollIntoView: true
      });
      
      // Focus the editor
      this.editor.focus();
      
      console.log(`Scrolled to node ${selectedNodeId} at line ${lineNumber}`);
    } else {
      console.log(`Node with ID ${selectedNodeId} not found in YAML`);
    }
  }

  private parseFrontMatter(content: string): FrontMatter {
    if (content.startsWith('---')) {
      const parts = content.split('---');
      if (parts.length >= 3) {
        const frontMatter = parts[1].trim();
        const yamlData = parts.slice(2).join('---').trim();
        
        try {
          const parsed = jsyaml.load(frontMatter) as any;
          const options = parsed.options || {};
          const cardDef = parsed.card || null;
          const schemaDef: SchemaDefinition = {};
          
          if (parsed.schema && typeof parsed.schema === 'object') {
            for (const [fieldName, fieldDef] of Object.entries(parsed.schema)) {
              if (typeof fieldDef === 'string') {
                schemaDef[fieldName] = this.parseSchemaField(fieldDef as string);
              }
            }
          }
          
          return { options, schema: schemaDef, card: cardDef, data: yamlData };
        } catch (error) {
          // Silently handle - linter will display errors in the editor
          return { options: {}, schema: {}, card: undefined, data: content };
        }
      }
    }
    return { options: {}, schema: {}, card: undefined, data: content };
  }

  private parseSchemaField(fieldDefinition: string): FieldSchema {
    const parts = fieldDefinition.split('|').map(p => p.trim());
    return {
      type: parts[0] || 'string',
      required: parts.includes('required'),
      missing: parts.includes('missing')
    };
  }

  /**
   * Resolve missing parentId values by looking up supervisor names.
   * This allows YAML data to omit parentId if a supervisor field contains
   * the name of another node. Also auto-generates missing id values.
   */
  private resolveMissingParentIds(data: any[]): any[] {
    // First pass: auto-generate missing ids
    // Detect if existing IDs are numeric or string-based (UUIDs, etc.)
    let hasNumericIds = false;
    let maxNumericId = 0;
    const existingIds = new Set<string>();

    for (const item of data) {
      if (item.id !== undefined && item.id !== null) {
        existingIds.add(String(item.id));
        const numId = typeof item.id === 'number' ? item.id : parseInt(String(item.id), 10);
        if (!isNaN(numId) && String(numId) === String(item.id)) {
          hasNumericIds = true;
          if (numId > maxNumericId) {
            maxNumericId = numId;
          }
        }
      }
    }

    // Helper to generate a unique ID
    let autoIdCounter = maxNumericId;
    const generateId = (item: any): string | number => {
      // Prefer email as ID if available
      if (item.email) {
        const emailId = String(item.email).toLowerCase();
        if (!existingIds.has(emailId)) {
          existingIds.add(emailId);
          return emailId;
        }
      }
      
      if (hasNumericIds || existingIds.size === 0) {
        // Use numeric IDs if existing IDs are numeric or if no IDs exist
        autoIdCounter++;
        return autoIdCounter;
      } else {
        // Generate a simple unique string ID (pseudo-UUID style)
        let newId: string;
        do {
          newId = `auto-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        } while (existingIds.has(newId));
        existingIds.add(newId);
        return newId;
      }
    };

    // Assign ids to items that don't have them
    const dataWithIds = data.map((item) => {
      if (item.id === undefined || item.id === null) {
        return { ...item, id: generateId(item), _autoGeneratedId: true };
      }
      return item;
    });

    // Build a map of name -> id for quick lookup
    const nameToId = new Map<string, any>();
    for (const item of dataWithIds) {
      const name = item[this.nameField];
      if (name) {
        // Store the name (normalized to lowercase for case-insensitive matching)
        nameToId.set(String(name).toLowerCase(), item.id);
      }
    }

    // Process each item and resolve missing parentId
    return dataWithIds.map(item => {
      // Skip if parentId is already set (including explicit null for root nodes)
      if (item.parentId !== undefined) {
        return item;
      }

      // Try to resolve parentId from supervisor field aliases
      for (const field of this.supervisorFields) {
        const supervisorName = item[field];
        if (supervisorName) {
          const normalizedName = String(supervisorName).toLowerCase();
          const parentId = nameToId.get(normalizedName);
          if (parentId !== undefined) {
            // Return a new object with the resolved parentId
            return { ...item, parentId };
          }
        }
      }

      // No parentId and couldn't resolve from supervisor - treat as root node
      return { ...item, parentId: null };
    });
  }

  private renderCardElement(element: CardElement, data: any): string {
    const tagName = Object.keys(element)[0];
    const config = element[tagName];

    // If config is a string, it's simple content
    if (typeof config === 'string') {
      // Replace variables like $name$ with actual data
      const content = this.replaceVariables(config, data);
      return `<${tagName}>${content}</${tagName}>`;
    }

    // Otherwise, it's a CardConfig object
    const attrs: string[] = [];
    let content = '';
    let children = '';

    if (config.class) {
      attrs.push(`class="${config.class}"`);
    }

    if (config.style) {
      attrs.push(`style="${config.style}"`);
    }

    if (config.content) {
      content = this.replaceVariables(config.content, data);
    }

    if (config.children && Array.isArray(config.children)) {
      children = config.children
        .map(child => this.renderCardElement(child, data))
        .join('');
    }

    const attrsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    return `<${tagName}${attrsStr}>${content}${children}</${tagName}>`;
  }

  private replaceVariables(template: string, data: any): string {
    return template.replace(/\$(\w+)\$/g, (_match, fieldName) => {
      const value = data[fieldName];
      // Return empty string for null, undefined, or empty values
      if (value === null || value === undefined || value === '') {
        return '';
      }
      return String(value);
    });
  }

  private renderChart(): void {
    try {
      if (this.forceGraph) {
        this.forceGraph.stop();
        this.forceGraph = null;
      }

      if (!this.editor) return;

      const yamlContent = this.editor.state.doc.toString();
      const { options: userOptions, schema: schemaDef, card: cardDef, data: yamlData } = this.parseFrontMatter(yamlContent);
      const options = { ...this.defaultOptions, ...userOptions };
      const parsedData = jsyaml.load(yamlData);

      // Store current schema and card template for template access
      this.currentSchema = schemaDef;
      this.cardTemplate = cardDef || null;

      if (!Array.isArray(parsedData)) {
        throw new Error('YAML must be an array');
      }

      // Resolve missing parentId values by looking up supervisor names
      const resolvedData = this.resolveMissingParentIds(parsedData);

      if (!this.orgChart) {
        this.orgChart = new OrgChart();
      }

      this.orgChart
        .container('#ychart-chart')
        .data(resolvedData)
        .nodeHeight(() => options.nodeHeight!)
        .nodeWidth(() => options.nodeWidth!)
        .childrenMargin(() => options.childrenMargin!)
        .compactMarginBetween(() => options.compactMarginBetween!)
        .compactMarginPair(() => options.compactMarginPair!)
        .neighbourMargin(() => options.neighbourMargin!)
        .onNodeClick((d: any) => {
          // Handle column adjust mode first
          if (this.columnAdjustMode) {
            this.handleNodeClickForColumnAdjust(d);
          }
          // Default: do nothing (selection is handled by d3-org-chart)
        })
        .onNodeDetailsClick((d: any) => {
          this.showNodeDetails(d.data);
        })
        .nodeContent((d: any) => this.getNodeContent(d))
        .render();
      
      // Apply pattern immediately after render
      if (this.bgPattern) {
        // Small delay to ensure SVG is ready
        setTimeout(() => this.applyBackgroundPattern(), 10);
      }
      
      // Fit to container bounds after render completes
      setTimeout(() => {
        if (this.orgChart && this.chartContainer) {
          this.orgChart.fit();
          
          // Reapply pattern after fit to ensure it persists
          if (this.bgPattern) {
            this.applyBackgroundPattern();
          }
        }
      }, 100);
      
      // Also reapply on any future updates (zoom, pan, etc)
      if (this.bgPattern) {
        this.setupPatternPersistence();
      }
      
      this.currentView = 'hierarchy';
    } catch (error) {
      // Silently handle - linter will display errors in the editor
    }
  }

  private getNodeContent(d: any): string {
    // Priority 1: Use custom template function if provided via .template()
    if (this.customTemplate) {
      return this.customTemplate(d, this.currentSchema);
    }
    
    // Priority 2: Use card template from YAML front matter if defined
    if (this.cardTemplate && Array.isArray(this.cardTemplate)) {
      const cardHtml = this.cardTemplate
        .map(element => this.renderCardElement(element, d.data))
        .join('');
      
      return `
        <div class="ychart-node-card ychart-card-template" style="width:${d.width}px;height:${d.height}px;padding:12px;background:#fff;border:2px solid #4A90E2;border-radius:8px;box-sizing:border-box;position:relative">
          <div class="ychart-details-btn details-btn" style="position:absolute;top:4px;right:4px;width:20px;height:20px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;color:#666;z-index:10;border:1px solid #ccc;" title="Show Details" aria-label="Show Details" role="button" tabindex="0">ℹ</div>
          ${cardHtml}
        </div>
      `;
    }
    
    // Priority 3: Default template
    return `
      <div class="ychart-node-card ychart-default-template" style="width:${d.width}px;height:${d.height}px;padding:12px;background:#fff;border:2px solid #4A90E2;border-radius:8px;box-sizing:border-box;display:flex;align-items:center;gap:12px;position:relative">
        <div class="ychart-details-btn details-btn" style="position:absolute;top:4px;right:4px;width:20px;height:20px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;color:#666;z-index:10;border:1px solid #ccc;" title="Show Details" aria-label="Show Details" role="button" tabindex="0">ℹ</div>
        <div class="ychart-node-content" style="flex:1;min-width:0">
          <div class="ychart-node-name" style="font-size:14px;font-weight:bold;color:#333;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.name || ''}</div>
          <div class="ychart-node-title" style="font-size:12px;color:#666;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.title || ''}</div>
          <div class="ychart-node-department" style="font-size:11px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.department || ''}</div>
        </div>
      </div>
    `;
  }

  private showNodeDetails(data: any): void {
    if (!this.detailsPanel) return;

    let html = '<div class="ychart-details-content node-details-content" style="font-family:sans-serif;">';
    html += `<h3 class="ychart-details-title" style="margin:0 0 1rem 0;color:#333;">${data.name || 'Unknown'}</h3>`;
    html += '<div class="ychart-details-grid" style="display:grid;gap:0.5rem;">';
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_') || key === 'picture') continue;
      
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      html += `
        <div class="ychart-details-row" style="display:grid;grid-template-columns:120px 1fr;gap:0.5rem;">
          <span class="ychart-details-label" style="font-weight:600;color:#666;">${label}:</span>
          <span class="ychart-details-value" style="color:#333;">${value || 'N/A'}</span>
        </div>
      `;
    }
    
    html += '</div>';
    html += `<button class="ychart-details-close-btn" onclick="document.getElementById('ychart-node-details').style.display='none'" style="margin-top:1rem;padding:0.5rem 1rem;background:#667eea;color:white;border:none;border-radius:4px;cursor:pointer;width:100%;">Close</button>`;
    html += '</div>';
    
    this.detailsPanel.innerHTML = html;
    this.detailsPanel.style.display = 'block';
  }

  private createDotPattern(): SVGDefsElement {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    const pattern = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "pattern"
    );
    pattern.setAttribute("id", "dotPattern");
    pattern.setAttribute("width", "20");
    pattern.setAttribute("height", "20");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    const dot = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    dot.setAttribute("cx", "2");
    dot.setAttribute("cy", "2");
    dot.setAttribute("r", "0.5");
    dot.setAttribute("fill", this.defaultOptions.patternColor || "#cccccc");

    pattern.appendChild(dot);
    defs.appendChild(pattern);

    return defs;
  }

  private createGridPattern(): SVGDefsElement {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    const pattern = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "pattern"
    );
    pattern.setAttribute("id", "gridPattern");
    pattern.setAttribute("width", "20");
    pattern.setAttribute("height", "20");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    // Horizontal line
    const hLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    hLine.setAttribute("x1", "0");
    hLine.setAttribute("y1", "0");
    hLine.setAttribute("x2", "20");
    hLine.setAttribute("y2", "0");
    hLine.setAttribute("stroke", this.defaultOptions.patternColor || "#cccccc");
    hLine.setAttribute("stroke-width", "0.5");
    hLine.setAttribute("stroke-dasharray", "3, 3");

    // Vertical line
    const vLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    vLine.setAttribute("x1", "0");
    vLine.setAttribute("y1", "0");
    vLine.setAttribute("x2", "0");
    vLine.setAttribute("y2", "20");
    vLine.setAttribute("stroke", this.defaultOptions.patternColor || "#cccccc");
    vLine.setAttribute("stroke-width", "0.5");
    vLine.setAttribute("stroke-dasharray", "3, 3");

    pattern.appendChild(hLine);
    pattern.appendChild(vLine);
    defs.appendChild(pattern);

    return defs;
  }

  private applyBackgroundPattern(): void {
    if (!this.chartContainer) return;

    const svg = this.chartContainer.querySelector('svg');
    if (!svg) {
      console.warn('SVG not found in chart container');
      return;
    }

    console.log('Applying background pattern:', this.bgPattern);

    // Get or create defs element
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.insertBefore(defs, svg.firstChild);
    }

    // Remove existing pattern definitions
    const existingPattern = defs.querySelector('#dotPattern, #gridPattern');
    if (existingPattern) {
      existingPattern.remove();
    }

    // Create and add pattern
    const patternDefs = this.bgPattern === 'dotted' 
      ? this.createDotPattern() 
      : this.createGridPattern();
    
    const patternElement = patternDefs.firstChild;
    if (patternElement) {
      defs.appendChild(patternElement);
    }

    // Remove existing background rect if any
    const existingRect = svg.querySelector('#pattern-background');
    if (existingRect) {
      existingRect.remove();
    }

    // Create background rect and insert it as the first child after defs
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("id", "pattern-background");
    
    // Use negative coords and very large size to ensure full coverage
    bgRect.setAttribute("x", "-50000");
    bgRect.setAttribute("y", "-50000");
    bgRect.setAttribute("width", "100000");
    bgRect.setAttribute("height", "100000");

    const patternId = this.bgPattern === 'dotted' ? 'dotPattern' : 'gridPattern';
    bgRect.setAttribute("fill", `url(#${patternId})`);
    
    // Insert as first visible element (right after defs, before everything else)
    const firstNonDefsChild = Array.from(svg.children).find(child => child.tagName !== 'defs');
    if (firstNonDefsChild) {
      svg.insertBefore(bgRect, firstNonDefsChild);
    } else {
      svg.appendChild(bgRect);
    }

    console.log('Pattern applied successfully');
  }

  private setupPatternPersistence(): void {
    if (!this.chartContainer) return;

    // Use MutationObserver to watch for SVG changes
    const observer = new MutationObserver(() => {
      if (this.bgPattern) {
        // Check if pattern is still there
        const svg = this.chartContainer?.querySelector('svg');
        const bgRect = svg?.querySelector('#pattern-background');
        if (svg && !bgRect) {
          // Pattern was removed, reapply it
          this.applyBackgroundPattern();
        }
      }
    });

    // Observe the chart container for child changes
    observer.observe(this.chartContainer, {
      childList: true,
      subtree: true
    });

    // Store observer reference for cleanup
    (this as any)._patternObserver = observer;
  }

  private renderForceGraph(): void {
    try {
      if (!this.editor) return;

      const yamlContent = this.editor.state.doc.toString();
      const { data: yamlData } = this.parseFrontMatter(yamlContent);
      const parsedData = jsyaml.load(yamlData);

      if (!Array.isArray(parsedData)) {
        throw new Error('YAML must be an array');
      }

      // Resolve missing parentId values by looking up supervisor names
      const resolvedData = this.resolveMissingParentIds(parsedData);

      if (this.forceGraph) {
        this.forceGraph.stop();
      }

      this.forceGraph = new ForceGraph('ychart-chart', (data: any) => this.showNodeDetails(data));
      this.forceGraph.render(resolvedData);
      
      this.currentView = 'force';
    } catch (error) {
      // Silently handle - linter will display errors in the editor
    }
  }

  /**
   * Attach enable swap mode button (DEPRECATED - buttons are now built-in)
   * @deprecated Use the built-in toolbar instead
   */
  enableSwapBtn(btnIdOrElement: string | HTMLElement): this {
    console.warn('enableSwapBtn is deprecated. Buttons are now built into the canvas.');
    const btn = typeof btnIdOrElement === 'string'
      ? document.getElementById(btnIdOrElement)
      : btnIdOrElement;

    if (!btn) {
      console.warn(`Swap button not found: ${btnIdOrElement}`);
      return this;
    }

    btn.addEventListener('click', () => this.handleSwapToggle());
    return this;
  }

  /**
   * Attach reset position button (DEPRECATED - buttons are now built-in)
   * @deprecated Use the built-in toolbar instead
   */
  resetBtn(btnIdOrElement: string | HTMLElement): this {
    console.warn('resetBtn is deprecated. Buttons are now built into the canvas.');
    const btn = typeof btnIdOrElement === 'string'
      ? document.getElementById(btnIdOrElement)
      : btnIdOrElement;

    if (!btn) {
      console.warn(`Reset button not found: ${btnIdOrElement}`);
      return this;
    }

    btn.addEventListener('click', () => this.handleReset());
    return this;
  }

  /**
   * Attach export SVG button (DEPRECATED - buttons are now built-in)
   * @deprecated Use the built-in toolbar instead
   */
  exportSVGBtn(btnIdOrElement: string | HTMLElement): this {
    console.warn('exportSVGBtn is deprecated. Buttons are now built into the canvas.');
    const btn = typeof btnIdOrElement === 'string'
      ? document.getElementById(btnIdOrElement)
      : btnIdOrElement;

    if (!btn) {
      console.warn(`Export button not found: ${btnIdOrElement}`);
      return this;
    }

    btn.addEventListener('click', () => this.handleExport());
    return this;
  }

  /**
   * Attach toggle view button (DEPRECATED - buttons are now built-in)
   * @deprecated Use the built-in toolbar instead
   */
  toggleViewBtn(btnIdOrElement: string | HTMLElement): this {
    console.warn('toggleViewBtn is deprecated. Buttons are now built into the canvas.');
    const btn = typeof btnIdOrElement === 'string'
      ? document.getElementById(btnIdOrElement)
      : btnIdOrElement;

    if (!btn) {
      console.warn(`Toggle view button not found: ${btnIdOrElement}`);
      return this;
    }

    btn.addEventListener('click', () => this.handleToggleView());
    return this;
  }

  /**
   * Set background pattern style
   */
  bgPatternStyle(style: 'dotted' | 'dashed'): this {
    this.bgPattern = style;
    this.renderChart();
    return this;
  }

  /**
   * Set action button position and orientation
   */
  actionBtnPos(
    position: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'topcenter' | 'bottomcenter',
    orientation: 'horizontal' | 'vertical'
  ): this {
    this.toolbarPosition = position;
    this.toolbarOrientation = orientation;
    
    // Recreate toolbar with new position
    if (this.toolbar && this.toolbar.parentElement) {
      const parent = this.toolbar.parentElement;
      parent.removeChild(this.toolbar);
      this.toolbar = this.createToolbar();
      parent.appendChild(this.toolbar);
    }
    
    return this;
  }

  /**
   * Set custom template function for node rendering
   * The function receives:
   * - d: node data object with d.data (your YAML properties), d.width, d.height
   * - schema: the schema definition from front matter
   */
  template(templateFn: (d: any, schema: SchemaDefinition) => string): this {
    this.customTemplate = templateFn;
    
    // Re-render chart with new template if already initialized
    if (this.orgChart) {
      this.renderChart();
    }
    
    return this;
  }

  /**
   * Configure the field names used for supervisor-based parentId resolution.
   * When a node is missing a parentId, the parser will attempt to find a parent
   * by matching the supervisor field value to another node's name field.
   * 
   * By default, the following fields are checked in order:
   * 'supervisor', 'reports', 'reports_to', 'manager', 'leader', 'parent'
   * 
   * @param supervisorFieldNames - The field(s) containing the supervisor's name. 
   *                               Can be a single string or an array of field names to check in order.
   * @param nameFieldName - The field containing the node's name for matching (default: 'name')
   */
  supervisorLookup(supervisorFieldNames: string | string[], nameFieldName: string = 'name'): this {
    this.supervisorFields = Array.isArray(supervisorFieldNames) ? supervisorFieldNames : [supervisorFieldNames];
    this.nameField = nameFieldName;
    
    // Re-render chart if already initialized
    if (this.orgChart) {
      this.renderChart();
    }
    
    return this;
  }

  private updateYAMLAfterSwap(data1: any, data2: any): void {
    try {
      if (!this.editor) return;

      this.isUpdatingProgrammatically = true;

      const yamlContent = this.editor.state.doc.toString();
      const { options: userOptions, schema: schemaDef, data: yamlData } = this.parseFrontMatter(yamlContent);
      const parsedData = jsyaml.load(yamlData);

      if (!Array.isArray(parsedData)) {
        console.error('Cannot update YAML: not an array');
        return;
      }

      const idx1 = parsedData.findIndex(item => String(item.id) === String(data1.id));
      const idx2 = parsedData.findIndex(item => String(item.id) === String(data2.id));

      if (idx1 === -1 || idx2 === -1) {
        console.error('Could not find nodes in YAML data');
        return;
      }

      [parsedData[idx1], parsedData[idx2]] = [parsedData[idx2], parsedData[idx1]];

      const frontMatter = `---
options:
${Object.entries(userOptions).map(([key, value]) => `  ${key}: ${value}`).join('\n')}
schema:
${Object.entries(schemaDef).map(([key, field]) => {
  const modifiers = [field.type, field.required ? 'required' : 'optional', field.missing ? 'missing' : ''].filter(Boolean);
  return `  ${key}: ${modifiers.join(' | ')}`;
}).join('\n')}
---

`;

      const newYamlData = jsyaml.dump(parsedData, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      const newContent = frontMatter + newYamlData;

      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: newContent
        }
      });

      console.log(`Nodes swapped: ${data1.name} ↔ ${data2.name}`);
    } catch (error) {
      console.error('Error updating YAML after swap:', error);
    } finally {
      this.isUpdatingProgrammatically = false;
    }
  }

  /**
   * Get current YAML content
   */
  getYAML(): string {
    return this.editor?.state.doc.toString() || '';
  }

  /**
   * Update YAML content programmatically
   */
  setYAML(yamlContent: string): this {
    if (!this.editor) return this;

    this.isUpdatingProgrammatically = true;

    this.editor.dispatch({
      changes: {
        from: 0,
        to: this.editor.state.doc.length,
        insert: yamlContent
      }
    });

    this.isUpdatingProgrammatically = false;
    this.renderChart();

    return this;
  }

  /**
   * Destroy the instance and clean up
   */
  destroy(): void {
    if (this.forceGraph) {
      this.forceGraph.stop();
    }
    if (this.editor) {
      this.editor.destroy();
    }
    if ((this as any)._patternObserver) {
      (this as any)._patternObserver.disconnect();
    }
    if (this.viewContainer) {
      this.viewContainer.innerHTML = '';
    }
  }
}

// Export for IIFE build - explicitly assign to window
if (typeof window !== "undefined") {
  (window as any).YChartEditor = YChartEditor;
}

export default YChartEditor;
