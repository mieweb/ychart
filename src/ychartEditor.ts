import { EditorView, basicSetup } from 'codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import * as jsyaml from 'js-yaml';
import { OrgChart } from './d3-org-chart.js';
import { ForceGraph } from './forceGraph.js';
import { NodeHeightSyncService } from './nodeHeightSyncService.js';
import './styles/styles.scss';

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
  experimental?: boolean;
}

interface FieldSchema {
  type: string;
  required: boolean;
  missing: boolean;
  aliases?: string[];  // Alternate field names that map to this field
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

// Generate a unique identifier for each editor instance
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
  private experimental = false;
  private instanceId: string;
  private searchPopup: HTMLElement | null = null;
  private searchHistoryPopup: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;
  // Default supervisor field aliases - can be overridden via schema or supervisorLookup()
  private supervisorFields: string[] = ['supervisor', 'reports', 'reports_to', 'manager', 'leader', 'parent'];
  private nameField: string = 'name';
  private nodeHeightSync: NodeHeightSyncService | null = null;
  
  constructor(options?: YChartOptions) {
    this.instanceId = generateUUID();
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
    this.experimental = this.defaultOptions.experimental || false;
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
    chartWrapper.style.cssText = 'flex:1;height:100%;position:relative;display:flex;flex-direction:column;overflow:hidden;';

    this.chartContainer = document.createElement('div');
    this.chartContainer.id = `ychart-chart-${this.instanceId}`;
    this.chartContainer.setAttribute('data-id', `ychart-chart-${this.instanceId}`);
    this.chartContainer.style.cssText = 'flex:1;width:100%;height:100%;position:relative;';
    chartWrapper.appendChild(this.chartContainer);

    // Create details panel
    this.detailsPanel = document.createElement('div');
    this.detailsPanel.id = `ychart-node-details-${this.instanceId}`;
    this.detailsPanel.setAttribute('data-id', `ychart-node-details-${this.instanceId}`);
    this.detailsPanel.style.cssText = `
      display: none;
      position: absolute;
      right: var(--yc-spacing-4xl);
      top: var(--yc-spacing-4xl);
      background: var(--yc-color-bg-card);
      border: var(--yc-border-width-medium) solid var(--yc-color-primary);
      border-radius: var(--yc-border-radius-lg);
      padding: var(--yc-spacing-5xl);
      box-shadow: var(--yc-shadow-lg);
      max-width: var(--yc-width-detail-panel);
      max-height: 80%;
      overflow-y: auto;
      z-index: var(--yc-z-index-detail-panel);
    `;
    chartWrapper.appendChild(this.detailsPanel);

    // Create toolbar
    this.toolbar = this.createToolbar();
    chartWrapper.appendChild(this.toolbar);

    // Create editor sidebar (now on right side, open by default)
    const editorSidebar = document.createElement('div');
    editorSidebar.id = `ychart-editor-sidebar-${this.instanceId}`;
    editorSidebar.setAttribute('data-id', `ychart-editor-sidebar-${this.instanceId}`);
    editorSidebar.style.cssText = `
      width: var(--yc-width-sidebar);
      height: 100%;
      border-left: var(--yc-border-width-thin) solid var(--yc-color-gray-500);
      overflow: hidden;
      position: relative;
      transition: width var(--yc-transition-normal), border-left-width 0s 0.3s;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    `;

    // Create error banner container (above editor)
    this.errorBanner = document.createElement('div');
    this.errorBanner.id = `ychart-error-banner-${this.instanceId}`;
    this.errorBanner.className = 'ychart-error-banner';
    this.errorBanner.style.cssText = `
      display: none;
      background: var(--yc-gradient-error);
      border-bottom: var(--yc-border-width-medium) solid var(--yc-color-error-border);
      padding: var(--yc-spacing-md) var(--yc-spacing-xl);
      max-height: var(--yc-height-error-banner-max);
      overflow-y: auto;
      font-family: var(--yc-font-family-base);
      font-size: var(--yc-font-size-base);
    `;
    editorSidebar.appendChild(this.errorBanner);

    // Create editor header with format button
    const editorHeader = document.createElement('div');
    editorHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--yc-spacing-md) var(--yc-spacing-xl);
      background: var(--yc-color-editor-bg);
      border-bottom: var(--yc-border-width-thin) solid var(--yc-color-editor-border);
    `;

    const editorTitle = document.createElement('div');
    editorTitle.textContent = 'YAML Editor';
    editorTitle.style.cssText = 'color: var(--yc-color-editor-text); font-size: var(--yc-font-size-sm); font-weight: var(--yc-font-weight-semibold);';
    editorHeader.appendChild(editorTitle);

    const formatBtn = document.createElement('button');
    formatBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
      <span style="margin-left: var(--yc-spacing-xs);">Format</span>
    `;
    formatBtn.style.cssText = `
      display: flex;
      align-items: center;
      background: var(--yc-color-primary);
      color: white;
      border: none;
      padding: var(--yc-spacing-xs) var(--yc-spacing-md);
      border-radius: var(--yc-border-radius-sm);
      cursor: pointer;
      font-size: var(--yc-font-size-xs);
      transition: background var(--yc-transition-fast);
    `;
    formatBtn.onmouseenter = () => {
      formatBtn.style.background = 'var(--yc-color-primary-dark)';
    };
    formatBtn.onmouseleave = () => {
      formatBtn.style.background = 'var(--yc-color-primary)';
    };
    formatBtn.onclick = () => this.handleFormatYAML();
    editorHeader.appendChild(formatBtn);

    editorSidebar.appendChild(editorHeader);

    // Create editor container
    this.editorContainer = document.createElement('div');
    this.editorContainer.id = `ychart-editor-${this.instanceId}`;
    this.editorContainer.setAttribute('data-id', `ychart-editor-${this.instanceId}`);
    this.editorContainer.style.cssText = 'width:100%;height:100%;flex:1;overflow:hidden;';
    editorSidebar.appendChild(this.editorContainer);

    // Create collapse button (positioned outside sidebar, on the left side of editor)
    if (this.defaultOptions.collapsible) {
      const collapseBtn = document.createElement('button');
      collapseBtn.setAttribute('data-id', `ychart-collapse-editor-${this.instanceId}`);
      collapseBtn.innerHTML = '▶';
      collapseBtn.style.cssText = `
        position: absolute;
        right: 399px;
        top: var(--yc-spacing-lg);
        z-index: var(--yc-z-index-collapse-button);
        background: var(--yc-color-primary);
        color: white;
        border: none;
        padding: var(--yc-spacing-md) var(--yc-spacing-sm);
        cursor: pointer;
        border-radius: var(--yc-border-radius-left);
        font-size: var(--yc-font-size-sm);
        transition: right var(--yc-transition-normal);
        box-shadow: var(--yc-shadow-sm);
      `;
      collapseBtn.onclick = () => this.toggleEditor();
      this.viewContainer.appendChild(collapseBtn);
    }

    // Append to main container (chart first, then editor)
    this.viewContainer.appendChild(chartWrapper);
    this.viewContainer.appendChild(editorSidebar);
  }

  private getToolbarPositionStyles(): string {
    const margin = 'var(--yc-spacing-4xl)';
    
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
        return `left: calc(100% + var(--yc-spacing-md)); top: 50%; transform: translateY(-50%) scale(0.8);`;
      }
      // If toolbar is on the right side, show tooltip to the left
      return `right: calc(100% + var(--yc-spacing-md)); top: 50%; transform: translateY(-50%) scale(0.8);`;
    }
    
    // For horizontal toolbars, show tooltip above or below
    // If toolbar is at the top, show tooltip below
    if (this.toolbarPosition.includes('top')) {
      return `top: calc(100% + var(--yc-spacing-md)); left: 50%; transform: translateX(-50%) scale(0.8);`;
    }
    
    // If toolbar is at the bottom, show tooltip above
    return `bottom: calc(100% + var(--yc-spacing-md)); left: 50%; transform: translateX(-50%) scale(0.8);`;
  }

  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.setAttribute('data-id', `ychart-toolbar-${this.instanceId}`);
    
    // Calculate position styles
    const positionStyles = this.getToolbarPositionStyles();
    const orientation = this.toolbarOrientation === 'vertical' ? 'column' : 'row';
    
    toolbar.style.cssText = `
      position: absolute;
      ${positionStyles}
      display: flex;
      flex-direction: ${orientation};
      gap: var(--yc-spacing-md);
      background: var(--yc-color-overlay-bg);
      backdrop-filter: var(--yc-backdrop-blur);
      border-radius: var(--yc-border-radius-xl);
      padding: var(--yc-spacing-md);
      box-shadow: var(--yc-shadow-2xl);
      z-index: var(--yc-z-index-toolbar);
      border: var(--yc-border-width-thin) solid var(--yc-color-shadow-light);
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
      search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
    };

    // Button configurations
    const buttons = [
      { id: 'fit', icon: icons.fit, tooltip: 'Fit to Screen', action: () => this.handleFit() },
      { id: 'reset', icon: icons.reset, tooltip: 'Reset Position', action: () => this.handleReset() },
      { id: 'search', icon: icons.search, tooltip: 'Search/Filter Nodes', action: () => this.handleSearch() },
      { id: 'expandAll', icon: icons.expandAll, tooltip: 'Expand All', action: () => this.handleExpandAll() },
      { id: 'collapseAll', icon: icons.collapseAll, tooltip: 'Collapse All', action: () => this.handleCollapseAll() },
      { id: 'columnAdjust', icon: icons.columnAdjust, tooltip: 'Adjust Child Columns', action: () => this.handleColumnAdjustToggle() },
      { id: 'swap', icon: icons.swap, tooltip: 'Swap Mode', action: () => this.handleSwapToggle() },
      { id: 'export', icon: icons.export, tooltip: 'Export SVG', action: () => this.handleExport() },
    ];

    // Add Force Graph toggle button only if experimental mode is enabled
    if (this.experimental) {
      buttons.splice(6, 0, { 
        id: 'toggleView', 
        icon: this.currentView === 'hierarchy' ? icons.forceGraph : icons.orgChart, 
        tooltip: this.currentView === 'hierarchy' ? 'Switch to Force Graph (Experimental)' : 'Switch to Org Chart', 
        action: () => this.handleToggleView() 
      });
    }

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.setAttribute('data-id', `ychart-btn-${btn.id}-${this.instanceId}`);
      button.innerHTML = btn.icon;
      button.setAttribute('data-tooltip', btn.tooltip);
      button.style.cssText = `
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--yc-width-toolbar-button);
        height: var(--yc-height-toolbar-button);
        border: none;
        background: transparent;
        color: var(--yc-color-icon);
        cursor: pointer;
        border-radius: var(--yc-border-radius-lg);
        transition: all var(--yc-transition-fast);
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
        background: var(--yc-color-overlay-dark);
        color: white;
        padding: var(--yc-spacing-sm) var(--yc-spacing-xl);
        border-radius: var(--yc-border-radius-md);
        font-size: var(--yc-font-size-sm);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: scale(0.8);
        transition: all var(--yc-transition-fast) var(--yc-transition-bounce);
        z-index: var(--yc-z-index-search-popup);
        box-shadow: var(--yc-shadow-md);
      `;
      
      button.appendChild(tooltip);

      // Add experimental badge for Force Graph toggle button
      if (btn.id === 'toggleView' && this.experimental) {
        const badge = document.createElement('span');
        badge.textContent = '!';
        badge.style.cssText = `
          position: absolute;
          top: -4px;
          right: -4px;
          background: var(--yc-color-warning-amber);
          color: white;
          border-radius: var(--yc-border-radius-full);
          width: var(--yc-height-badge);
          height: var(--yc-height-badge);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--yc-font-size-sm);
          font-weight: var(--yc-font-weight-bold);
          box-shadow: var(--yc-shadow-sm);
        `;
        button.appendChild(badge);
      }

      button.onmouseenter = () => {
        button.style.background = 'var(--yc-color-primary)';
        button.style.color = 'white';
        button.style.transform = 'var(--yc-transform-button-hover)';
        
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
          button.style.background = 'var(--yc-color-accent-red)';
          button.style.color = 'white';
        } else if (btn.id === 'columnAdjust' && this.columnAdjustMode) {
          button.style.background = 'var(--yc-color-accent-purple)';
          button.style.color = 'white';
        } else {
          button.style.background = 'transparent';
          button.style.color = 'var(--yc-color-icon)';
        }
        button.style.transform = 'var(--yc-transform-button-active)';
        
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
    const swapBtn = document.querySelector(`[data-id="ychart-btn-swap-${this.instanceId}"]`) as HTMLElement;
    if (swapBtn) {
      if (this.swapModeEnabled) {
        swapBtn.style.background = 'var(--yc-color-accent-red)';
        swapBtn.style.color = 'white';
      } else {
        swapBtn.style.background = 'transparent';
        swapBtn.style.color = 'var(--yc-color-icon)';
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
    const toggleBtn = document.querySelector(`[data-id="ychart-btn-toggleView-${this.instanceId}"]`) as HTMLElement;
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

  private handleFormatYAML(): void {
    if (!this.editor) return;

    try {
      // Get current YAML content
      const currentContent = this.editor.state.doc.toString();
      
      // Check if content has front matter (starts with ---)
      if (currentContent.startsWith('---')) {
        const parts = currentContent.split('---');
        if (parts.length >= 3) {
          // Parse front matter and data separately
          const frontMatter = parts[1].trim();
          const dataContent = parts.slice(2).join('---').trim();
          
          // Parse front matter to extract card template (if exists)
          const parsedFrontMatter = jsyaml.load(frontMatter) as any;
          const cardTemplate = parsedFrontMatter?.card || null;
          
          // Remove card from parsed object before formatting
          // (we'll add it back as raw YAML to preserve structure)
          if (parsedFrontMatter && parsedFrontMatter.card) {
            delete parsedFrontMatter.card;
          }
          
          // Format the rest of front matter (options, schema)
          const formattedFrontMatter = jsyaml.dump(parsedFrontMatter, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
          });
          
          // Parse and format data content
          const parsedData = jsyaml.load(dataContent);
          const formattedData = jsyaml.dump(parsedData, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
          });
          
          // If card template exists, extract its raw YAML from original
          let cardYaml = '';
          if (cardTemplate) {
            // Find the card section in the original front matter
            const cardMatch = frontMatter.match(/^card:\s*\n((?:[ \t]+.*\n?)*)/m);
            if (cardMatch) {
              cardYaml = 'card:\n' + cardMatch[1];
            }
          }
          
          // Reconstruct the complete YAML with front matter
          let reconstructedFrontMatter = formattedFrontMatter.trim();
          if (cardYaml) {
            // Append card template after other front matter sections
            reconstructedFrontMatter += '\n' + cardYaml.trim();
          }
          
          const formatted = `---\n${reconstructedFrontMatter}\n---\n\n${formattedData.trim()}\n`;
          
          // Update the editor with formatted YAML
          this.editor.dispatch({
            changes: {
              from: 0,
              to: this.editor.state.doc.length,
              insert: formatted
            }
          });
        }
      } else {
        // No front matter, format as single document
        const parsed = jsyaml.load(currentContent);
        const formatted = jsyaml.dump(parsed, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        });
        
        this.editor.dispatch({
          changes: {
            from: 0,
            to: this.editor.state.doc.length,
            insert: formatted
          }
        });
      }

      console.log('YAML formatted successfully');
    } catch (error) {
      console.error('Failed to format YAML:', error);
      alert(`Failed to format YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private handleSearch(): void {
    if (!this.searchPopup) {
      this.createSearchPopup();
    }
    
    if (this.searchPopup) {
      this.searchPopup.style.display = 'flex';
      const searchInput = this.searchPopup.querySelector('input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  }

  private createSearchPopup(): void {
    if (!this.chartContainer) return;

    const popup = document.createElement('div');
    popup.setAttribute('data-id', `ychart-search-popup-${this.instanceId}`);
    popup.style.cssText = `
      position: absolute;
      top: 5px;
      left: 50%;
      transform: translateX(-50%);
      display: none;
      z-index: 1000;
    `;

    const searchBox = document.createElement('div');
    searchBox.style.cssText = `
      background: var(--yc-color-bg-card);
      border-radius: var(--yc-border-radius-lg);
      padding: var(--yc-spacing-lg) var(--yc-spacing-2xl);
      box-shadow: var(--yc-shadow-4xl);
      width: var(--yc-width-search-popup);
      display: flex;
      flex-direction: column;
      gap: var(--yc-spacing-md);
      position: relative;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Search Nodes';
    title.style.cssText = `
      margin: 0;
      font-size: var(--yc-font-size-md);
      font-weight: var(--yc-font-weight-semibold);
      color: var(--yc-color-gray-900);
    `;

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 6px;
      align-items: center;
    `;

    // Search history burger button
    const historyButton = document.createElement('button');
    historyButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    `;
    historyButton.style.cssText = `
      position: relative;
      background: var(--yc-color-button-bg);
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      padding: 0;
    `;

    const historyTooltip = document.createElement('span');
    historyTooltip.textContent = 'Search History';
    historyTooltip.style.cssText = `
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 8px;
      background: var(--yc-color-overlay-dark);
      color: white;
      padding: var(--yc-spacing-button-padding-sm);
      border-radius: var(--yc-border-radius-sm);
      font-size: var(--yc-font-size-xs);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s;
      z-index: 1000;
    `;

    historyButton.appendChild(historyTooltip);

    historyButton.addEventListener('mouseenter', () => {
      historyButton.style.background = 'var(--yc-color-button-bg-hover)';
      historyButton.style.borderColor = 'var(--yc-color-primary)';
      historyTooltip.style.opacity = '1';
      historyTooltip.style.transform = 'scale(1)';
    });

    historyButton.addEventListener('mouseleave', () => {
      historyButton.style.background = 'var(--yc-color-button-bg)';
      historyButton.style.borderColor = 'var(--yc-color-button-border)';
      historyTooltip.style.opacity = '0';
      historyTooltip.style.transform = 'scale(0.8)';
    });

    historyButton.addEventListener('click', () => {
      this.toggleSearchHistory();
    });

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: var(--yc-font-size-3xl);
      color: var(--yc-color-text-light);
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--yc-border-radius-sm);
      transition: all 0.2s;
    `;
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'var(--yc-color-button-bg)';
      closeButton.style.color = 'var(--yc-color-icon)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'none';
      closeButton.style.color = 'var(--yc-color-text-light)';
    });
    closeButton.addEventListener('click', () => this.closeSearchPopup());

    buttonsContainer.appendChild(historyButton);
    buttonsContainer.appendChild(closeButton);

    header.appendChild(title);
    header.appendChild(buttonsContainer);

    // Filters container
    const filtersContainer = document.createElement('div');
    filtersContainer.setAttribute('data-id', 'search-filters');
    filtersContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    // Add initial filter row
    const initialFilter = this.createFilterRow(filtersContainer);
    filtersContainer.appendChild(initialFilter);

    // Add filter button
    const addFilterBtn = document.createElement('button');
    addFilterBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: var(--yc-spacing-xs);">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add Filter
    `;
    addFilterBtn.style.cssText = `
      padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
      background: var(--yc-color-button-bg);
      color: var(--yc-color-primary);
      border: 1px dashed var(--yc-color-button-border-hover);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-sm);
      font-weight: var(--yc-font-weight-semibold);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
    `;
    addFilterBtn.addEventListener('mouseenter', () => {
      addFilterBtn.style.background = 'var(--yc-color-button-bg-hover)';
      addFilterBtn.style.borderColor = 'var(--yc-color-primary)';
    });
    addFilterBtn.addEventListener('mouseleave', () => {
      addFilterBtn.style.background = 'var(--yc-color-button-bg)';
      addFilterBtn.style.borderColor = 'var(--yc-color-button-border-hover)';
    });
    addFilterBtn.addEventListener('click', () => {
      const newFilter = this.createFilterRow(filtersContainer);
      filtersContainer.insertBefore(newFilter, addFilterBtn);
    });

    filtersContainer.appendChild(addFilterBtn);

    // Suggestions container
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.setAttribute('data-id', 'search-suggestions');
    suggestionsContainer.style.cssText = `
      display: none;
      flex-direction: column;
      max-height: 150px;
      overflow-y: auto;
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      background: var(--yc-color-bg-card);
      box-shadow: 0 2px 8px var(--yc-color-shadow-light);
    `;

    searchBox.appendChild(header);
    searchBox.appendChild(filtersContainer);
    searchBox.appendChild(suggestionsContainer);

    popup.appendChild(searchBox);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.searchPopup && this.searchPopup.style.display !== 'none') {
        this.closeSearchPopup();
      }
    });

    this.chartContainer.appendChild(popup);
    this.searchPopup = popup;
  }

  private createFilterRow(container: HTMLElement): HTMLElement {
    const filterRow = document.createElement('div');
    filterRow.style.cssText = `
      display: flex;
      gap: 6px;
      align-items: center;
    `;

    // Field selector dropdown
    const fieldSelect = document.createElement('select');
    fieldSelect.style.cssText = `
      padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-base);
      outline: none;
      cursor: pointer;
      background: var(--yc-color-bg-card);
      min-width: 120px;
      transition: border-color 0.2s;
    `;

    // Get available fields from schema or from data
    const fields = this.getAvailableFields();
    fields.forEach(field => {
      const option = document.createElement('option');
      option.value = field;
      option.textContent = field.charAt(0).toUpperCase() + field.slice(1);
      fieldSelect.appendChild(option);
    });

    fieldSelect.addEventListener('focus', () => {
      fieldSelect.style.borderColor = 'var(--yc-color-primary)';
    });

    fieldSelect.addEventListener('blur', () => {
      fieldSelect.style.borderColor = 'var(--yc-color-button-border)';
    });

    // Search input container with suggestions
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = `
      position: relative;
      flex: 1;
    `;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Type to search...';
    searchInput.style.cssText = `
      width: 100%;
      padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-base);
      outline: none;
      transition: border-color 0.2s;
    `;

    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = 'var(--yc-color-primary)';
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        searchInput.style.borderColor = 'var(--yc-color-button-border)';
      }, 200);
    });

    // Real-time search as user types
    searchInput.addEventListener('input', () => {
      this.performFuzzySearch(searchInput.value, fieldSelect.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSearchPopup();
      }
    });

    inputWrapper.appendChild(searchInput);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.style.cssText = `
      padding: 0;
      width: 28px;
      height: 28px;
      background: var(--yc-color-error-light);
      color: var(--yc-color-error-red-accent);
      border: 1px solid var(--yc-color-error-red-border);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-2xl);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;

    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.background = 'var(--yc-color-error-red-hover)';
    });

    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.background = 'var(--yc-color-error-light)';
    });

    removeBtn.addEventListener('click', () => {
      // Don't remove if it's the last filter
      const filters = container.querySelectorAll('[data-id="filter-row"]');
      if (filters.length > 1) {
        filterRow.remove();
        // Trigger search update
        this.performFuzzySearch('', '');
      }
    });

    filterRow.setAttribute('data-id', 'filter-row');
    filterRow.appendChild(fieldSelect);
    filterRow.appendChild(inputWrapper);
    filterRow.appendChild(removeBtn);

    return filterRow;
  }

  private getAvailableFields(): string[] {
    // Get fields from schema if available
    if (this.currentSchema && Object.keys(this.currentSchema).length > 0) {
      return Object.keys(this.currentSchema).filter(key => !key.startsWith('_'));
    }

    // Otherwise, get fields from data
    if (this.orgChart) {
      const attrs = this.orgChart.getChartState();
      const allNodes = attrs.allNodes || [];
      if (allNodes.length > 0) {
        const fields = new Set<string>();
        allNodes.forEach((node: any) => {
          Object.keys(node.data).forEach(key => {
            if (!key.startsWith('_')) {
              fields.add(key);
            }
          });
        });
        return Array.from(fields).sort();
      }
    }

    // Default fields
    return ['name', 'title', 'email', 'department', 'location'];
  }

  private performFuzzySearch(_query: string, _field: string): void {
    const suggestionsContainer = this.searchPopup?.querySelector('[data-id="search-suggestions"]') as HTMLElement;
    if (!suggestionsContainer || !this.orgChart) return;

    // Get all filter inputs
    const filterRows = this.searchPopup?.querySelectorAll('[data-id="filter-row"]');
    if (!filterRows) return;

    const filters: { field: string; query: string }[] = [];
    filterRows.forEach(row => {
      const select = row.querySelector('select') as HTMLSelectElement;
      const input = row.querySelector('input') as HTMLInputElement;
      if (select && input && input.value.trim()) {
        filters.push({ field: select.value, query: input.value.trim().toLowerCase() });
      }
    });

    // If no filters have values, hide suggestions
    if (filters.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    // Save to search history (but only when there are actual results)
    // We'll save after we find matches

    const attrs = this.orgChart.getChartState();
    const allNodes = attrs.allNodes || [];

    // Perform fuzzy matching
    const matches: { node: any; score: number }[] = [];
    
    allNodes.forEach((node: any) => {
      let totalScore = 0;
      let matchCount = 0;

      filters.forEach(filter => {
        const fieldValue = node.data[filter.field];
        if (fieldValue) {
          const score = this.fuzzyMatch(filter.query, String(fieldValue).toLowerCase());
          if (score > 0) {
            totalScore += score;
            matchCount++;
          }
        }
      });

      // Only include if all filters match
      if (matchCount === filters.length) {
        matches.push({ node, score: totalScore / matchCount });
      }
    });

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    // Display suggestions
    suggestionsContainer.innerHTML = '';

    if (matches.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    suggestionsContainer.style.display = 'flex';

    matches.forEach(({ node, score }) => {
      const suggestionItem = document.createElement('div');
      suggestionItem.style.cssText = `
        padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
        border-bottom: 1px solid var(--yc-color-button-bg);
        cursor: pointer;
        transition: background 0.2s;
      `;

      const nodeData = node.data;
      const displayName = nodeData.name || attrs.nodeId(nodeData);
      const displayTitle = nodeData.title || '';
      const displayDept = nodeData.department || '';

      suggestionItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--yc-spacing-md);">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: var(--yc-font-weight-semibold); color: var(--yc-color-text-heading); font-size: var(--yc-font-size-sm); line-height: var(--yc-line-height-tight); margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
            ${displayTitle ? `<div style="font-size: var(--yc-font-size-xs); line-height: var(--yc-line-height-tight); color: var(--yc-color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayTitle}</div>` : ''}
            ${displayDept ? `<div style="font-size: var(--yc-font-size-xs); line-height: var(--yc-line-height-tight); color: var(--yc-color-text-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayDept}</div>` : ''}
          </div>
          <div style="font-size: var(--yc-font-size-xs); color: var(--yc-color-primary); font-weight: var(--yc-font-weight-semibold); flex-shrink: 0;">${Math.round(score * 100)}%</div>
        </div>
      `;

      suggestionItem.addEventListener('mouseenter', () => {
        suggestionItem.style.background = 'var(--yc-color-button-bg)';
      });

      suggestionItem.addEventListener('mouseleave', () => {
        suggestionItem.style.background = 'white';
      });

      suggestionItem.addEventListener('click', () => {
        this.selectAndHighlightNode(node);
        // Don't close popup, just clear inputs and suggestions
        const inputs = this.searchPopup?.querySelectorAll('input[type="text"]');
        inputs?.forEach((input: any) => {
          input.value = '';
        });
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
      });

      suggestionsContainer.appendChild(suggestionItem);
    });
  }

  private fuzzyMatch(pattern: string, text: string): number {
    // Simple fuzzy matching algorithm
    // Returns a score between 0 and 1
    if (!pattern || !text) return 0;
    if (text.includes(pattern)) return 1; // Exact substring match gets highest score

    let score = 0;
    let patternIdx = 0;
    let textIdx = 0;
    let consecutiveMatches = 0;

    while (patternIdx < pattern.length && textIdx < text.length) {
      if (pattern[patternIdx] === text[textIdx]) {
        score += 1 + consecutiveMatches;
        consecutiveMatches++;
        patternIdx++;
      } else {
        consecutiveMatches = 0;
      }
      textIdx++;
    }

    if (patternIdx !== pattern.length) return 0; // Pattern not fully matched

    // Normalize score
    const maxScore = pattern.length * (pattern.length + 1) / 2;
    return score / maxScore;
  }

  private closeSearchPopup(): void {
    if (this.searchPopup) {
      this.searchPopup.style.display = 'none';
      const suggestionsContainer = this.searchPopup.querySelector('[data-id="search-suggestions"]') as HTMLElement;
      if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
      }
      const inputs = this.searchPopup.querySelectorAll('input[type="text"]');
      inputs.forEach((input: any) => {
        input.value = '';
      });
    }
    // Also close history popup
    if (this.searchHistoryPopup) {
      this.searchHistoryPopup.style.display = 'none';
    }
  }

  private toggleSearchHistory(): void {
    if (!this.searchHistoryPopup) {
      this.createSearchHistoryPopup();
    }
    
    if (this.searchHistoryPopup) {
      const isVisible = this.searchHistoryPopup.style.display !== 'none';
      if (isVisible) {
        this.searchHistoryPopup.style.display = 'none';
      } else {
        this.updateSearchHistoryDisplay();
        this.searchHistoryPopup.style.display = 'block';
      }
    }
  }

  private createSearchHistoryPopup(): void {
    if (!this.chartContainer || !this.searchPopup) return;

    const historyPopup = document.createElement('div');
    historyPopup.setAttribute('data-id', `ychart-search-history-${this.instanceId}`);
    historyPopup.style.cssText = `
      position: absolute;
      top: calc(100% + 5px);
      left: 50%;
      transform: translateX(-50%);
      display: none;
      z-index: 999;
    `;

    const historyBox = document.createElement('div');
    historyBox.style.cssText = `
      background: var(--yc-color-bg-card);
      border-radius: var(--yc-border-radius-lg);
      padding: 10px 14px;
      box-shadow: 0 4px 16px var(--yc-color-shadow-dark);
      width: 500px;
      max-height: 300px;
      display: flex;
      flex-direction: column;
      gap: var(--yc-spacing-md);
    `;

    const historyHeader = document.createElement('div');
    historyHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    `;

    const historyTitle = document.createElement('h4');
    historyTitle.textContent = 'Search History';
    historyTitle.style.cssText = `
      margin: 0;
      font-size: var(--yc-font-size-base);
      font-weight: var(--yc-font-weight-semibold);
      color: var(--yc-color-gray-900);
    `;

    const clearAllButton = document.createElement('button');
    clearAllButton.textContent = 'Clear All';
    clearAllButton.style.cssText = `
      background: var(--yc-color-error-light);
      color: var(--yc-color-error-red-accent);
      border: 1px solid var(--yc-color-error-red-border);
      border-radius: var(--yc-border-radius-md);
      padding: 4px 10px;
      font-size: var(--yc-font-size-xs);
      font-weight: var(--yc-font-weight-semibold);
      cursor: pointer;
      transition: all 0.2s;
    `;

    clearAllButton.addEventListener('mouseenter', () => {
      clearAllButton.style.background = 'var(--yc-color-error-red-hover)';
    });

    clearAllButton.addEventListener('mouseleave', () => {
      clearAllButton.style.background = 'var(--yc-color-error-light)';
    });

    clearAllButton.addEventListener('click', () => {
      this.clearSearchHistory();
    });

    historyHeader.appendChild(historyTitle);
    historyHeader.appendChild(clearAllButton);

    const historyList = document.createElement('div');
    historyList.setAttribute('data-id', 'history-list');
    historyList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 250px;
      overflow-y: auto;
    `;

    historyBox.appendChild(historyHeader);
    historyBox.appendChild(historyList);
    historyPopup.appendChild(historyBox);

    this.searchPopup.appendChild(historyPopup);
    this.searchHistoryPopup = historyPopup;
  }

  private updateSearchHistoryDisplay(): void {
    if (!this.searchHistoryPopup) return;

    const historyList = this.searchHistoryPopup.querySelector('[data-id="history-list"]') as HTMLElement;
    if (!historyList) return;

    historyList.innerHTML = '';

    const history = this.loadSearchHistory();

    if (history.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = 'No search history';
      emptyMessage.style.cssText = `
        padding: 20px;
        text-align: center;
        color: var(--yc-color-text-light);
        font-size: var(--yc-font-size-sm);
      `;
      historyList.appendChild(emptyMessage);
      return;
    }

    history.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: var(--yc-spacing-md);
        padding: 8px 10px;
        background: var(--yc-color-button-bg);
        border: 1px solid var(--yc-color-button-border);
        border-radius: var(--yc-border-radius-md);
        transition: all 0.2s;
        cursor: pointer;
      `;

      const historyContent = document.createElement('div');
      historyContent.style.cssText = `
        flex: 1;
        min-width: 0;
      `;

      const searchText = `${item.field}: "${item.query}"`;
      const nodeInfo = item.nodeName ? ` → ${item.nodeName}` : '';
      const timestamp = new Date(item.timestamp).toLocaleString();

      historyContent.innerHTML = `
        <div style="font-size: var(--yc-font-size-sm); color: var(--yc-color-text-heading); font-weight: var(--yc-font-weight-medium); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${searchText}${nodeInfo}</div>
        <div style="font-size: var(--yc-font-size-xs); color: var(--yc-color-text-light);">${timestamp}</div>
      `;

      const removeButton = document.createElement('button');
      removeButton.innerHTML = '×';
      removeButton.style.cssText = `
        background: var(--yc-color-error-light);
        color: var(--yc-color-error-red-accent);
        border: 1px solid var(--yc-color-error-red-border);
        border-radius: var(--yc-border-radius-sm);
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        font-size: var(--yc-font-size-xl);
        flex-shrink: 0;
      `;

      removeButton.addEventListener('mouseenter', () => {
        removeButton.style.background = 'var(--yc-color-error-red-hover)';
      });

      removeButton.addEventListener('mouseleave', () => {
        removeButton.style.background = 'var(--yc-color-error-light)';
      });

      removeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeHistoryItem(index);
      });

      historyItem.addEventListener('mouseenter', () => {
        historyItem.style.background = 'var(--yc-color-button-bg-hover)';
        historyItem.style.borderColor = 'var(--yc-color-button-border-hover)';
      });

      historyItem.addEventListener('mouseleave', () => {
        historyItem.style.background = 'var(--yc-color-button-bg)';
        historyItem.style.borderColor = 'var(--yc-color-button-border)';
      });

      historyItem.addEventListener('click', () => {
        this.applyHistorySearch(item);
      });

      historyItem.appendChild(historyContent);
      historyItem.appendChild(removeButton);
      historyList.appendChild(historyItem);
    });
  }

  private getSearchHistoryKey(): string {
    return `ychart-search-history-${this.instanceId}`;
  }

  private loadSearchHistory(): Array<{ field: string; query: string; nodeId?: string; nodeName?: string; timestamp: number }> {
    try {
      const stored = localStorage.getItem(this.getSearchHistoryKey());
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
    return [];
  }

  private clearSearchHistory(): void {
    try {
      localStorage.removeItem(this.getSearchHistoryKey());
      this.updateSearchHistoryDisplay();
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }

  private removeHistoryItem(index: number): void {
    try {
      const history = this.loadSearchHistory();
      history.splice(index, 1);
      localStorage.setItem(this.getSearchHistoryKey(), JSON.stringify(history));
      this.updateSearchHistoryDisplay();
    } catch (error) {
      console.warn('Failed to remove history item:', error);
    }
  }

  private applyHistorySearch(historyItem: { field: string; query: string; nodeId?: string; nodeName?: string; timestamp: number }): void {
    if (!this.searchPopup) return;

    const filtersContainer = this.searchPopup.querySelector('[data-id="search-filters"]') as HTMLElement;
    if (!filtersContainer) return;

    // Remove all existing filter rows except the add button
    const existingFilters = filtersContainer.querySelectorAll('[data-id="filter-row"]');
    existingFilters.forEach(filter => filter.remove());

    const addButton = filtersContainer.querySelector('button');

    // Add single filter row based on history
    const filterRow = this.createFilterRow(filtersContainer);
    const select = filterRow.querySelector('select') as HTMLSelectElement;
    const input = filterRow.querySelector('input') as HTMLInputElement;

    if (select && input) {
      select.value = historyItem.field;
      input.value = historyItem.query;
    }

    if (addButton) {
      filtersContainer.insertBefore(filterRow, addButton);
    } else {
      filtersContainer.appendChild(filterRow);
    }

    // Trigger search
    this.performFuzzySearch(historyItem.query, historyItem.field);

    // Close history popup
    if (this.searchHistoryPopup) {
      this.searchHistoryPopup.style.display = 'none';
    }
  }



  private selectAndHighlightNode(node: any): void {
    if (!this.orgChart) return;

    const attrs = this.orgChart.getChartState();
    const nodeId = attrs.nodeId(node.data);

    // Save to search history
    this.saveSearchToHistory(node);

    // Use setCentered to properly expand ancestors and center the node
    if (typeof this.orgChart.setCentered === 'function') {
      this.orgChart.setCentered(nodeId);
    }

    // Set as selected node
    attrs.selectedNodeId = nodeId;

    // Re-render the chart with the centered and expanded node
    this.orgChart.render();

    // Focus the SVG to enable keyboard navigation
    setTimeout(() => {
      const svg = attrs.svg?.node();
      if (svg) {
        svg.focus();
      }
    }, 100);

    // Call onNodeSelect callback if available
    if (attrs.onNodeSelect) {
      attrs.onNodeSelect(nodeId);
    }

    // Fit the view to center on the selected node after rendering completes
    setTimeout(() => {
      if (this.orgChart && typeof this.orgChart.fit === 'function') {
        // Get the updated node from the tree after rendering
        const updatedAttrs = this.orgChart.getChartState();
        const updatedRoot = updatedAttrs.root;
        const descendants = updatedRoot.descendants();
        const updatedNode = descendants.find((d: any) => attrs.nodeId(d.data) === nodeId);
        
        if (updatedNode) {
          this.orgChart.fit({ nodes: [updatedNode], animate: true });
        }
      }
    }, 400);
  }

  private saveSearchToHistory(node: any): void {
    if (!this.searchPopup) return;

    // Get current filter values (just use the first one that has a value)
    const filterRows = this.searchPopup.querySelectorAll('[data-id="filter-row"]');
    let field = '';
    let query = '';

    for (const row of Array.from(filterRows)) {
      const select = row.querySelector('select') as HTMLSelectElement;
      const input = row.querySelector('input') as HTMLInputElement;
      if (select && input && input.value.trim()) {
        field = select.value;
        query = input.value.trim();
        break; // Only take the first active filter
      }
    }

    if (!field || !query) return;

    try {
      const history = this.loadSearchHistory();
      const nodeData = node.data;
      const nodeName = nodeData.name || '';
      const attrs = this.orgChart?.getChartState();
      const nodeId = attrs ? attrs.nodeId(nodeData) : '';
      
      // Check if this exact search already exists
      const isDuplicate = history.some(item => 
        item.field === field && item.query === query && item.nodeId === nodeId
      );

      if (!isDuplicate) {
        // Add new search to beginning of array
        history.unshift({
          field,
          query,
          nodeId,
          nodeName,
          timestamp: Date.now()
        });

        // Keep only last 20 searches
        const trimmedHistory = history.slice(0, 20);
        
        localStorage.setItem(this.getSearchHistoryKey(), JSON.stringify(trimmedHistory));
      }
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }



  private handleColumnAdjustToggle(): void {
    if (!this.orgChart) return;

    this.columnAdjustMode = !this.columnAdjustMode;

    // Update button style
    const columnAdjustBtn = document.querySelector(`[data-id="ychart-btn-columnAdjust-${this.instanceId}"]`) as HTMLElement;
    if (columnAdjustBtn) {
      if (this.columnAdjustMode) {
        columnAdjustBtn.style.background = 'var(--yc-color-accent-purple)';
        columnAdjustBtn.style.color = 'white';
        console.log('Column adjust mode enabled. Click a parent node to adjust its children column layout.');
      } else {
        columnAdjustBtn.style.background = 'transparent';
        columnAdjustBtn.style.color = 'var(--yc-color-icon)';
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
    this.columnAdjustButtons.setAttribute('data-id', `ychart-column-adjust-controls-${this.instanceId}`);
    this.columnAdjustButtons.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--yc-color-overlay-bg);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px var(--yc-color-shadow-dark);
      z-index: 100;
      border: 2px solid var(--yc-color-accent-purple);
      min-width: 300px;
    `;

    const title = document.createElement('div');
    title.textContent = `Adjust Children Columns`;
    title.style.cssText = `
      font-size: var(--yc-font-size-xl);
      font-weight: var(--yc-font-weight-semibold);
      margin-bottom: 15px;
      color: var(--yc-color-ui-slate);
      text-align: center;
    `;
    this.columnAdjustButtons.appendChild(title);

    const info = document.createElement('div');
    info.textContent = `Node: ${nodeData.data.name || nodeData.data.id} (${childrenCount} children)`;
    info.style.cssText = `
      font-size: var(--yc-font-size-base);
      color: var(--yc-color-ui-slate-light);
      margin-bottom: 15px;
      text-align: center;
    `;
    this.columnAdjustButtons.appendChild(info);

    // Column controls
    const controlsWrapper = document.createElement('div');
    controlsWrapper.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-bottom: 15px;
    `;

    const decreaseBtn = document.createElement('button');
    decreaseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    decreaseBtn.disabled = currentColumns <= 2;
    decreaseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      background: ${currentColumns <= 2 ? 'var(--yc-color-ui-gray-light)' : 'var(--yc-color-accent-purple)'};
      color: white;
      border-radius: var(--yc-border-radius-lg);
      cursor: ${currentColumns <= 2 ? 'not-allowed' : 'pointer'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    if (currentColumns > 2) {
      decreaseBtn.onmouseover = () => decreaseBtn.style.background = 'var(--yc-color-accent-purple-dark)';
      decreaseBtn.onmouseleave = () => decreaseBtn.style.background = 'var(--yc-color-accent-purple)';
      decreaseBtn.onclick = () => this.adjustNodeColumns(nodeData, currentColumns - 1);
    }

    const columnDisplay = document.createElement('div');
    columnDisplay.textContent = `${currentColumns} Columns`;
    columnDisplay.style.cssText = `
      font-size: var(--yc-font-size-2xl);
      font-weight: var(--yc-font-weight-semibold);
      color: var(--yc-color-ui-slate);
      min-width: 100px;
      text-align: center;
    `;

    const increaseBtn = document.createElement('button');
    increaseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    increaseBtn.disabled = currentColumns >= childrenCount;
    increaseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      background: ${currentColumns >= childrenCount ? 'var(--yc-color-ui-gray-light)' : 'var(--yc-color-accent-purple)'};
      color: white;
      border-radius: var(--yc-border-radius-lg);
      cursor: ${currentColumns >= childrenCount ? 'not-allowed' : 'pointer'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    if (currentColumns < childrenCount) {
      increaseBtn.onmouseover = () => increaseBtn.style.background = 'var(--yc-color-accent-purple-dark)';
      increaseBtn.onmouseleave = () => increaseBtn.style.background = 'var(--yc-color-accent-purple)';
      increaseBtn.onclick = () => this.adjustNodeColumns(nodeData, currentColumns + 1);
    }

    controlsWrapper.appendChild(decreaseBtn);
    controlsWrapper.appendChild(columnDisplay);
    controlsWrapper.appendChild(increaseBtn);
    this.columnAdjustButtons.appendChild(controlsWrapper);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      border: none;
      background: var(--yc-color-ui-slate-lighter);
      color: white;
      border-radius: var(--yc-border-radius-lg);
      cursor: pointer;
      font-size: var(--yc-font-size-md);
      font-weight: var(--yc-font-weight-medium);
      transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = 'var(--yc-color-ui-slate-light)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'var(--yc-color-ui-slate-lighter)';
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
          // Detect which format is being used: id/parentId or name/supervisor
          // If any item has 'name' but no 'id', treat as name-based format
          const hasNameField = parsed.some((item: any) => item.name !== undefined);
          const hasIdField = parsed.some((item: any) => item.id !== undefined);
          const usesNameFormat = hasNameField && !hasIdField;
          
          if (usesNameFormat) {
            // Validate name/supervisor format
            const names = new Set(parsed.map((item: any) => item[this.nameField]));
            
            // Helper to get supervisor value from any of the alias fields
            const getSupervisor = (item: any): string | undefined => {
              for (const field of this.supervisorFields) {
                if (item[field]) return item[field];
              }
              return undefined;
            };
            
            // Identify root nodes: nodes with no supervisor OR supervisor that doesn't match any name
            // Root nodes are allowed - their supervisor field is informational (e.g., "Board of Directors")
            const rootNodes = (parsed as any[]).filter((item: any) => {
              const supervisor = getSupervisor(item);
              return !supervisor || !names.has(supervisor);
            });
            
            if (rootNodes.length > 1) {
              // Mark all root nodes after the first as errors
              for (let i = 1; i < rootNodes.length; i++) {
                const item = rootNodes[i];
                const namePattern = new RegExp(`^-\\s*name:\\s*${this.escapeRegex(item.name)}`, 'm');
                
                const itemMatch = content.match(namePattern);
                let errorPos = 0;
                let errorEnd = content.length;
                
                if (itemMatch && itemMatch.index !== undefined) {
                  errorPos = itemMatch.index;
                  errorEnd = itemMatch.index + itemMatch[0].length;
                }
                
                const lineNumber = content.substring(0, errorPos).split('\n').length;
                
                diagnostics.push({
                  from: errorPos,
                  to: errorEnd,
                  severity: 'error',
                  message: `Line ${lineNumber}: Multiple root nodes detected - only one node can have no supervisor (name: ${item.name})`
                });
              }
            }
            
            // Note: We don't flag "invalid supervisor" errors for name-based format
            // because a supervisor that doesn't match any name is treated as a root node
            // (e.g., "Board of Directors" is a valid supervisor for the CEO even though
            // there's no person with that name in the org)
          } else {
            // Validate id/parentId format (or mixed format with both id and supervisor)
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
            
            // Skip multiple roots check when using supervisor-based resolution
            // (nodes without parentId will have it resolved from supervisor field)
            const hasSupervisorFields = parsed.some((item: any) => 
              this.supervisorFields.some(field => item[field] !== undefined)
            );
            
            if (!hasSupervisorFields) {
              // Only check for multiple roots if not using supervisor-based resolution
              const rootNodes = (parsed as any[]).filter((item: any) => 
                item.parentId === null || item.parentId === undefined
              );
              
              if (rootNodes.length > 1) {
                // Mark all root nodes after the first as errors
                for (let i = 1; i < rootNodes.length; i++) {
                  const item = rootNodes[i];
                  const itemIdPattern = new RegExp(`^-\\s*id:\\s*${item.id}\\s*$`, 'm');
                  const parentIdPattern = new RegExp(`parentId:\\s*null`, 'm');
                  
                  const itemMatch = content.match(itemIdPattern);
                  let errorPos = 0;
                  let errorEnd = content.length;
                  
                  if (itemMatch && itemMatch.index !== undefined) {
                    const afterId = content.substring(itemMatch.index);
                    const parentIdMatch = afterId.match(parentIdPattern);
                    if (parentIdMatch && parentIdMatch.index !== undefined) {
                      errorPos = itemMatch.index + parentIdMatch.index;
                      errorEnd = errorPos + parentIdMatch[0].length;
                    } else {
                      // If no explicit parentId: null, mark the id line
                      errorPos = itemMatch.index;
                      errorEnd = itemMatch.index + itemMatch[0].length;
                    }
                  }
                  
                  const lineNumber = content.substring(0, errorPos).split('\n').length;
                  
                  diagnostics.push({
                    from: errorPos,
                    to: errorEnd,
                    severity: 'error',
                    message: `Line ${lineNumber}: Multiple root nodes detected - only one node can have parentId: null (node id: ${item.id})`
                  });
                }
              }
            }
            
            // Check for missing/invalid parentId references (only if explicitly set)
            for (const item of parsed as any[]) {
              const parentId = item.parentId;
              // parentId should be null for root, or reference an existing node (by id or email)
              if (parentId !== null && parentId !== undefined && 
                  !nodeIds.has(String(parentId)) && !nodeIds.has(String(parentId).toLowerCase())) {
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

  private toggleEditor(): void {
    const sidebar = document.getElementById(`ychart-editor-sidebar-${this.instanceId}`);
    const collapseBtn = document.querySelector(`[data-id="ychart-collapse-editor-${this.instanceId}"]`) as HTMLElement;
    
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
      gap: var(--yc-spacing-md);
      margin-bottom: 6px;
      font-weight: var(--yc-font-weight-semibold);
      color: var(--yc-color-error-red-dark);
    `;
    header.innerHTML = `
      <span style="font-size: var(--yc-font-size-xl);">⚠️</span>
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
        gap: var(--yc-spacing-md);
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
        background: ${diagnostic.severity === 'error' ? 'var(--yc-color-error-red-light)' : 'var(--yc-color-warning-amber-dark)'};
        color: white;
        border: none;
        border-radius: var(--yc-border-radius-sm);
        padding: 2px 8px;
        font-size: var(--yc-font-size-xs);
        font-weight: var(--yc-font-weight-semibold);
        cursor: pointer;
        flex-shrink: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      `;
      jumpBtn.onmouseover = () => {
        jumpBtn.style.background = diagnostic.severity === 'error' ? 'var(--yc-color-error-red-dark)' : 'var(--yc-color-warning-amber-darker)';
      };
      jumpBtn.onmouseleave = () => {
        jumpBtn.style.background = diagnostic.severity === 'error' ? 'var(--yc-color-error-red-light)' : 'var(--yc-color-warning-amber-dark)';
      };
      jumpBtn.onclick = () => {
        this.jumpToLine(lineNumber);
      };

      // Create message text
      const messageSpan = document.createElement('span');
      messageSpan.textContent = displayMessage;
      messageSpan.style.cssText = `
        color: var(--yc-color-error-red-text);
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
    const sidebar = document.getElementById(`ychart-editor-sidebar-${this.instanceId}`);
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
                const fieldSchema = this.parseSchemaField(fieldDef as string, fieldName);
                schemaDef[fieldName] = fieldSchema;
                
                // If this field has aliases, also add the aliases to schema
                if (fieldSchema.aliases && fieldSchema.aliases.length > 0) {
                  for (const alias of fieldSchema.aliases) {
                    schemaDef[alias] = { ...fieldSchema, aliases: [fieldName] };
                  }
                }
              }
            }
            
            // Update supervisor fields based on schema aliases for 'supervisor' field
            if (schemaDef.supervisor && schemaDef.supervisor.aliases) {
              this.supervisorFields = ['supervisor', ...schemaDef.supervisor.aliases];
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

  /**
   * Parse a schema field definition string.
   * 
   * Supported formats:
   *   1. Basic: "string | required"
   *   2. Bracket aliases: "[ supervisor | leader | manager ] string | optional"
   *   3. Alias keyword: "string | optional | alias: leader, manager, reports_to"
   *   4. Aliases array: "string | optional | aliases[leader, manager]"
   * 
   * Examples:
   *   - "string | required" -> type: string, required: true
   *   - "string | optional" -> type: string, required: false
   *   - "[ supervisor | leader | manager ]" -> aliases: ['leader', 'manager']
   *   - "string | optional | alias: leader, manager" -> aliases: ['leader', 'manager']
   *   - "string | optional | aliases[leader, manager]" -> aliases: ['leader', 'manager']
   */
  private parseSchemaField(fieldDefinition: string, _fieldName?: string): FieldSchema {
    let aliases: string[] | undefined;
    let workingDef = fieldDefinition;
    
    // Check for bracket alias syntax: [ field1 | field2 | field3 ]
    const bracketMatch = workingDef.match(/^\s*\[\s*(.+?)\s*\]\s*(.*)$/);
    if (bracketMatch) {
      const aliasesStr = bracketMatch[1];
      workingDef = bracketMatch[2];
      
      // Parse aliases (split by |)
      const aliasParts = aliasesStr.split('|').map(p => p.trim()).filter(p => p);
      aliases = aliasParts.slice(1); // First one is the primary field name
    }
    
    // Check for "alias:" or "aliases:" keyword syntax
    // e.g., "string | optional | alias: leader, manager, reports_to"
    const aliasKeywordMatch = workingDef.match(/\|\s*alias(?:es)?:\s*([^|]+)/i);
    if (aliasKeywordMatch) {
      const aliasStr = aliasKeywordMatch[1];
      const parsedAliases = aliasStr.split(',').map(a => a.trim()).filter(a => a);
      aliases = aliases ? [...aliases, ...parsedAliases] : parsedAliases;
      // Remove the alias part from working definition
      workingDef = workingDef.replace(/\|\s*alias(?:es)?:\s*[^|]+/i, '');
    }
    
    // Check for "aliases[...]" syntax
    // e.g., "string | optional | aliases[leader, manager]"
    const aliasArrayMatch = workingDef.match(/\|\s*aliases?\s*\[\s*([^\]]+)\s*\]/i);
    if (aliasArrayMatch) {
      const aliasStr = aliasArrayMatch[1];
      // Handle both quoted and unquoted values
      const parsedAliases = aliasStr
        .split(',')
        .map(a => a.trim().replace(/^["']|["']$/g, '')) // Remove quotes
        .filter(a => a);
      aliases = aliases ? [...aliases, ...parsedAliases] : parsedAliases;
      // Remove the alias part from working definition
      workingDef = workingDef.replace(/\|\s*aliases?\s*\[[^\]]+\]/i, '');
    }
    
    // Parse remaining parts for type, required, etc.
    const parts = workingDef.split('|').map(p => p.trim()).filter(p => p);
    const type = parts.find(p => !['required', 'optional', 'missing'].includes(p.toLowerCase())) || 'string';
    
    return {
      type,
      required: parts.some(p => p.toLowerCase() === 'required'),
      missing: parts.some(p => p.toLowerCase() === 'missing'),
      aliases: aliases && aliases.length > 0 ? aliases : undefined
    };
  }

  /**
   * Escape special regex characters in a string for safe use in RegExp constructor.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private renderCardElement(element: CardElement, data: any): string {
    const tagName = Object.keys(element)[0];
    const config = element[tagName];

    // If config is a string, it's simple content
    if (typeof config === 'string') {
      // Replace variables like $name$ with actual data
      const content = this.replaceVariables(config, data);
      
      // Add word-break style to span elements
      if (tagName === 'span') {
        return `<${tagName} style="word-break:break-all">${content}</${tagName}>`;
      }
      
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
      // Add word-break to existing style for span elements
      if (tagName === 'span') {
        const existingStyle = config.style.trim();
        const separator = existingStyle.endsWith(';') ? '' : ';';
        attrs.push(`style="${existingStyle}${separator}word-break:break-all"`);
      } else {
        attrs.push(`style="${config.style}"`);
      }
    } else if (tagName === 'span') {
      // Add word-break style if no style exists
      attrs.push(`style="word-break:break-all"`);
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

  /**
   * Resolve missing parentId values by looking up supervisor names.
   * This allows YAML data to omit parentId if a supervisor field contains
   * the name of another node. Also auto-generates missing id values.
   * 
   * Supports multiple supervisor field aliases configurable via schema:
   *   supervisor: [ supervisor | leader | manager | reports_to ]
   * Or via .supervisorLookup() fluent API.
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
      let parsedData = jsyaml.load(yamlData);

      // Store current schema and card template for template access
      this.currentSchema = schemaDef;
      this.cardTemplate = cardDef || null;

      if (!Array.isArray(parsedData)) {
        throw new Error('YAML must be an array');
      }

      // Resolve missing parentId values by looking up supervisor names
      parsedData = this.resolveMissingParentIds(parsedData);

      if (!this.orgChart) {
        this.orgChart = new OrgChart();
      }

      this.orgChart
        .container(`#ychart-chart-${this.instanceId}`)
        .data(parsedData)
        .nodeHeight(() => options.nodeHeight!)
        .nodeWidth(() => options.nodeWidth!)
        .childrenMargin(() => options.childrenMargin!)
        .compactMarginBetween(() => options.compactMarginBetween!)
        .compactMarginPair(() => options.compactMarginPair!)
        .neighbourMargin(() => options.neighbourMargin!)
        .onNodeClick((d: any, _i: number, _arr: any) => {
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
          
          // Initialize height synchronization after nodes are rendered
          this.initializeHeightSync();
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
        <div style="width:${d.width}px;height:${d.height}px;padding:var(--yc-spacing-xl);background:var(--yc-color-text-inverse);border:var(--yc-border-width-medium) solid var(--yc-color-secondary);border-radius:var(--yc-border-radius-lg);box-sizing:border-box;position:relative">
          <div class="details-btn" style="position:absolute;top:var(--yc-spacing-xs);right:var(--yc-spacing-xs);width:var(--yc-height-icon-sm);height:var(--yc-height-icon-sm);background:var(--yc-color-gray-300);border-radius:var(--yc-border-radius-full);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:var(--yc-font-size-sm);color:var(--yc-color-text-secondary);z-index:var(--yc-z-index-overlay);border:var(--yc-border-width-thin) solid var(--yc-color-gray-500);" title="Show Details" aria-label="Show Details" role="button" tabindex="0">ℹ</div>
          ${cardHtml}
        </div>
      `;
    }
    
    // Priority 3: Default template
    return `
      <div style="width:${d.width}px;height:${d.height}px;padding:var(--yc-spacing-xl);background:var(--yc-color-text-inverse);border:var(--yc-border-width-medium) solid var(--yc-color-secondary);border-radius:var(--yc-border-radius-lg);box-sizing:border-box;display:flex;align-items:center;gap:var(--yc-spacing-xl);position:relative">
        <div class="details-btn" style="position:absolute;top:var(--yc-spacing-xs);right:var(--yc-spacing-xs);width:var(--yc-height-icon-sm);height:var(--yc-height-icon-sm);background:var(--yc-color-gray-300);border-radius:var(--yc-border-radius-full);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:var(--yc-font-size-sm);color:var(--yc-color-text-secondary);z-index:var(--yc-z-index-overlay);border:var(--yc-border-width-thin) solid var(--yc-color-gray-500);" title="Show Details" aria-label="Show Details" role="button" tabindex="0">ℹ</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:var(--yc-font-size-md);font-weight:var(--yc-font-weight-bold);color:var(--yc-color-text-primary);margin-bottom:var(--yc-spacing-xs);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.name || ''}</div>
          <div style="font-size:var(--yc-font-size-sm);color:var(--yc-color-text-secondary);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.title || ''}</div>
          <div style="font-size:var(--yc-font-size-xs);color:var(--yc-color-gray-600);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.department || ''}</div>
        </div>
      </div>
    `;
  }

  private showNodeDetails(data: any): void {
    if (!this.detailsPanel) return;

    let html = '<div class="node-details-content" style="font-family:var(--yc-font-family-base);">';
    html += `<h3 style="margin:0 0 var(--yc-spacing-3xl) 0;color:var(--yc-color-text-primary);">${data.name || 'Unknown'}</h3>`;
    html += '<div style="display:grid;gap:var(--yc-spacing-md);">';
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_') || key === 'picture') continue;
      
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      html += `
        <div style="display:grid;grid-template-columns:120px 1fr;gap:var(--yc-spacing-md);">
          <span style="font-weight:var(--yc-font-weight-semibold);color:var(--yc-color-text-secondary);">${label}:</span>
          <span style="color:var(--yc-color-text-primary);">${value || 'N/A'}</span>
        </div>
      `;
    }
    
    html += '</div>';
    html += `<button onclick="document.getElementById('ychart-node-details-${this.instanceId}').style.display='none'" style="margin-top:var(--yc-spacing-3xl);padding:var(--yc-spacing-md) var(--yc-spacing-3xl);background:var(--yc-color-primary);color:white;border:none;border-radius:var(--yc-border-radius-sm);cursor:pointer;width:100%;">Close</button>`;
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
    dot.setAttribute("fill", this.defaultOptions.patternColor || "var(--yc-color-pattern)");

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
    hLine.setAttribute("stroke", this.defaultOptions.patternColor || "var(--yc-color-pattern)");
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
    vLine.setAttribute("stroke", this.defaultOptions.patternColor || "var(--yc-color-pattern)");
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

  /**
   * Initialize node height synchronization service
   * Ensures all nodes have the same height based on the tallest content
   */
  private initializeHeightSync(): void {
    if (!this.chartContainer) return;

    // Clean up existing service if any
    if (this.nodeHeightSync) {
      this.nodeHeightSync.destroy();
    }

    // Find the SVG container within the chart
    const svg = this.chartContainer.querySelector('svg');
    if (!svg) {
      console.warn('SVG not found for height sync');
      return;
    }

    // Initialize the height sync service
    this.nodeHeightSync = new NodeHeightSyncService(svg, {
      minHeight: this.defaultOptions.nodeHeight || 110,
      maxHeight: 500, // Reasonable max to prevent excessive heights
      heightPadding: 10, // Add a bit of padding for breathing room
      resizeDebounce: 150,
      onHeightChange: (newHeight) => {
        console.log(`Node heights synchronized to: ${newHeight}px`);
        
        // Update the org chart's node height setting
        if (this.orgChart) {
          this.orgChart.nodeHeight(() => newHeight);
        }
      }
    });

    // Perform initial sync
    this.nodeHeightSync.init();
  }

  private renderForceGraph(): void {
    try {
      if (!this.editor) return;

      const yamlContent = this.editor.state.doc.toString();
      const { data: yamlData } = this.parseFrontMatter(yamlContent);
      const parsedData = jsyaml.load(yamlData) as any[];

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
