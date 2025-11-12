import { EditorView, basicSetup } from 'codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
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
    this.chartContainer.id = 'ychart-chart';
    this.chartContainer.style.cssText = 'flex:1;width:100%;height:100%;position:relative;';
    chartWrapper.appendChild(this.chartContainer);

    // Create details panel
    this.detailsPanel = document.createElement('div');
    this.detailsPanel.id = 'ychart-node-details';
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
    editorSidebar.style.cssText = `
      width: 400px;
      height: 100%;
      border-left: 1px solid #ccc;
      overflow: hidden;
      position: relative;
      transition: width 0.3s ease, border-left-width 0s 0.3s;
      flex-shrink: 0;
    `;

    // Create editor container
    this.editorContainer = document.createElement('div');
    this.editorContainer.id = 'ychart-editor';
    this.editorContainer.style.cssText = 'width:100%;height:100%;';
    editorSidebar.appendChild(this.editorContainer);

    // Create collapse button (positioned outside sidebar, on the left side of editor)
    if (this.defaultOptions.collapsible) {
      const collapseBtn = document.createElement('button');
      collapseBtn.id = 'ychart-collapse-editor';
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
    };

    // Button configurations
    const buttons = [
      { id: 'fit', icon: icons.fit, tooltip: 'Fit to Screen', action: () => this.handleFit() },
      { id: 'reset', icon: icons.reset, tooltip: 'Reset Position', action: () => this.handleReset() },
      { id: 'swap', icon: icons.swap, tooltip: 'Swap Mode', action: () => this.handleSwapToggle() },
      { id: 'toggleView', icon: this.currentView === 'hierarchy' ? icons.forceGraph : icons.orgChart, tooltip: this.currentView === 'hierarchy' ? 'Switch to Force Graph' : 'Switch to Org Chart', action: () => this.handleToggleView() },
      { id: 'export', icon: icons.export, tooltip: 'Export SVG', action: () => this.handleExport() },
    ];

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.id = `ychart-btn-${btn.id}`;
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

  private initializeEditor(): void {
    if (!this.editorContainer) return;

    const extensions = [
      basicSetup,
      yaml(),
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
          console.error('Error parsing front matter:', error);
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

      if (!this.orgChart) {
        this.orgChart = new OrgChart();
      }

      this.orgChart
        .container('#ychart-chart')
        .data(parsedData)
        .nodeHeight(() => options.nodeHeight!)
        .nodeWidth(() => options.nodeWidth!)
        .childrenMargin(() => options.childrenMargin!)
        .compactMarginBetween(() => options.compactMarginBetween!)
        .compactMarginPair(() => options.compactMarginPair!)
        .neighbourMargin(() => options.neighbourMargin!)
        .onNodeClick((d: any) => this.showNodeDetails(d.data))
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
      console.error('Error rendering chart:', error);
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
        <div style="width:${d.width}px;height:${d.height}px;padding:12px;background:#fff;border:2px solid #4A90E2;border-radius:8px;box-sizing:border-box;">
          ${cardHtml}
        </div>
      `;
    }
    
    // Priority 3: Default template
    return `
      <div style="width:${d.width}px;height:${d.height}px;padding:12px;background:#fff;border:2px solid #4A90E2;border-radius:8px;box-sizing:border-box;display:flex;align-items:center;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:bold;color:#333;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.name || ''}</div>
          <div style="font-size:12px;color:#666;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.title || ''}</div>
          <div style="font-size:11px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.department || ''}</div>
        </div>
      </div>
    `;
  }

  private showNodeDetails(data: any): void {
    if (!this.detailsPanel) return;

    let html = '<div class="node-details-content" style="font-family:sans-serif;">';
    html += `<h3 style="margin:0 0 1rem 0;color:#333;">${data.name || 'Unknown'}</h3>`;
    html += '<div style="display:grid;gap:0.5rem;">';
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_') || key === 'picture') continue;
      
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      html += `
        <div style="display:grid;grid-template-columns:120px 1fr;gap:0.5rem;">
          <span style="font-weight:600;color:#666;">${label}:</span>
          <span style="color:#333;">${value || 'N/A'}</span>
        </div>
      `;
    }
    
    html += '</div>';
    html += `<button onclick="document.getElementById('ychart-node-details').style.display='none'" style="margin-top:1rem;padding:0.5rem 1rem;background:#667eea;color:white;border:none;border-radius:4px;cursor:pointer;width:100%;">Close</button>`;
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

      if (this.forceGraph) {
        this.forceGraph.stop();
      }

      this.forceGraph = new ForceGraph('ychart-chart', (data: any) => this.showNodeDetails(data));
      this.forceGraph.render(parsedData);
      
      this.currentView = 'force';
    } catch (error) {
      console.error('Error rendering force graph:', error);
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
