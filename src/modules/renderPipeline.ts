/**
 * Render pipeline for YChart.
 * Manages hierarchy chart rendering, force graph rendering, node content,
 * node details, and height synchronization.
 * Extracted from YChartEditor to isolate the core rendering path.
 */

import * as jsyaml from 'js-yaml';
import { EditorView } from 'codemirror';
import { OrgChart } from '../d3-org-chart.js';
import { ForceGraph } from './forceGraph';
import { applyBackgroundPattern, setupPatternPersistence } from './patterns';
import { buildExpandSiblingsBtn, buildExpandSupervisorChainBtn, renderNodeContent, renderNodeDetails } from './nodeRenderer';
import { NodeHeightSyncService } from './nodeHeightSyncService';
import { ColumnAdjustManager } from './columnAdjust';
import { POIManager } from './poiManager';
import type { YChartOptions, SchemaDefinition, CardElement, FrontMatter } from './types';

export interface RenderPipelineContext {
  instanceId: string;
  getEditor: () => EditorView | null;
  getDefaultOptions: () => YChartOptions;
  getChartContainer: () => HTMLElement | null;
  getDetailsPanel: () => HTMLElement | null;
  getCustomTemplate: () => ((d: any, schema: SchemaDefinition) => string) | null;
  getBgPattern: () => 'dotted' | 'dashed' | undefined;
  getPOIManager: () => POIManager;
  getColumnAdjustManager: () => ColumnAdjustManager;
  parseFrontMatter: (content: string) => FrontMatter;
  resolveMissingParentIds: (data: any[]) => any[];
}

export class RenderPipeline {
  private ctx: RenderPipelineContext;

  // Mutable render state — readable by YChartEditor for fluent API and coordination
  orgChart: any = null;
  forceGraph: ForceGraph | null = null;
  currentView: 'hierarchy' | 'force' = 'hierarchy';
  currentSchema: SchemaDefinition = {};
  cardTemplate: CardElement[] | null = null;
  currentOptions: YChartOptions = {};
  truthData: any[] = [];
  private nodeHeightSync: NodeHeightSyncService | null = null;

  constructor(ctx: RenderPipelineContext) {
    this.ctx = ctx;
  }

  render(): void {
    try {
      if (this.forceGraph) {
        this.forceGraph.stop();
        this.forceGraph = null;
        this.orgChart = null;
        this.ctx.getChartContainer()?.replaceChildren();
      }

      const editor = this.ctx.getEditor();
      if (!editor) return;

      const yamlContent = editor.state.doc.toString();
      const { options: userOptions, schema: schemaDef, card: cardDef, data: yamlData } = this.ctx.parseFrontMatter(yamlContent);
      const defaultOptions = this.ctx.getDefaultOptions();
      const options = { ...defaultOptions, ...userOptions };

      // Store current merged options for use by other methods (e.g., initializeHeightSync)
      this.currentOptions = options;

      const poiManager = this.ctx.getPOIManager();

      // Capture 'self' option for initial POI (only on first render)
      if (!poiManager.selfApplied && options.self !== undefined) {
        poiManager.initialSelf = options.self;
      }

      const parsedData = jsyaml.load(yamlData);

      // Store current schema and card template for template access
      this.currentSchema = schemaDef;
      this.cardTemplate = cardDef || null;

      if (!Array.isArray(parsedData)) {
        throw new Error('YAML must be an array');
      }

      // Resolve missing parentId values by looking up supervisor names
      const resolvedData = this.ctx.resolveMissingParentIds(parsedData);

      // Store truth data (complete YAML) for POI filtering comparisons
      this.truthData = resolvedData;

      // Update POI selector with all people from truth data
      poiManager.updatePOISelector(resolvedData);

      // Build virtual data list - filters based on POI and expanded siblings
      const virtualData = poiManager.buildVirtualData(resolvedData);

      if (!this.orgChart) {
        this.orgChart = new OrgChart();
      }

      const columnAdjustManager = this.ctx.getColumnAdjustManager();

      const chartContainer = this.ctx.getChartContainer();
      if (!chartContainer) return;

      this.orgChart
        .container(chartContainer)
        .data(virtualData)
        .nodeHeight(() => options.nodeHeight!)
        .nodeWidth(() => options.nodeWidth!)
        .childrenMargin(() => options.childrenMargin!)
        .compactMarginBetween(() => options.compactMarginBetween!)
        .compactMarginPair(() => options.compactMarginPair!)
        .neighbourMargin(() => options.neighbourMargin!)
        .onNodeClick((d: any, _i: number, _arr: any) => {
          // Handle column adjust mode first
          if (columnAdjustManager.isActive) {
            columnAdjustManager.handleNodeClick(d);
          }
          // Default: do nothing (selection is handled by d3-org-chart)
        })
        .onNodeDetailsClick((d: any) => {
          this.showNodeDetails(d.data);
        })
        .nodeContent((d: any) => this.getNodeContent(d))
        .render();

      const bgPattern = this.ctx.getBgPattern();

      // Set up pattern persistence observer (always, it will only act if bgPattern is set)
      setupPatternPersistence(chartContainer!, () => this.ctx.getBgPattern(), defaultOptions.patternColor);

      // Apply pattern immediately after render
      if (bgPattern) {
        // Small delay to ensure SVG is ready
        setTimeout(() => applyBackgroundPattern(chartContainer!, bgPattern, defaultOptions.patternColor), 10);
      }

      // Fit to container bounds after render completes
      setTimeout(() => {
        if (this.orgChart && chartContainer) {
          this.orgChart.fit();

          // Reapply pattern after fit to ensure it persists
          const currentBgPattern = this.ctx.getBgPattern();
          if (currentBgPattern) {
            applyBackgroundPattern(chartContainer, currentBgPattern, defaultOptions.patternColor);
          }

          // Initialize height synchronization after nodes are rendered
          this.initializeHeightSync();

          // Apply initial 'self' POI if set in options (only once)
          poiManager.applyInitialSelf();
        }
      }, 100);

      this.currentView = 'hierarchy';
    } catch (_error) {
      // Silently handle - linter will display errors in the editor
    }
  }

  renderForce(): void {
    try {
      const editor = this.ctx.getEditor();
      if (!editor) return;

      const yamlContent = editor.state.doc.toString();
      const { data: yamlData } = this.ctx.parseFrontMatter(yamlContent);
      const parsedData = jsyaml.load(yamlData) as any[];

      if (!Array.isArray(parsedData)) {
        throw new Error('YAML must be an array');
      }

      // Resolve missing parentId values by looking up supervisor names
      const resolvedData = this.ctx.resolveMissingParentIds(parsedData);

      if (this.forceGraph) {
        this.forceGraph.stop();
      }
      this.orgChart = null;

      const chartContainer = this.ctx.getChartContainer();
      if (!chartContainer) return;

      this.forceGraph = new ForceGraph(chartContainer, (data: any) => this.showNodeDetails(data));
      this.forceGraph.render(resolvedData);

      this.currentView = 'force';
    } catch (_error) {
      // Silently handle - linter will display errors in the editor
    }
  }

  getNodeContent(d: any): string {
    const poiManager = this.ctx.getPOIManager();
    const showExpandSiblings = poiManager.shouldShowExpandSiblings(d.data.id);
    const siblingsExpanded = poiManager.expandedSiblings.has(String(d.data.id));
    const siblingCount = showExpandSiblings ? poiManager.getSiblingCount(d.data.id) : 0;

    const { directSupervisor } = poiManager.getSupervisorChainInfo();
    const isTopmost = poiManager.isTopmostVisibleSupervisor(d.data.id);
    const showSupervisorChainBtn = isTopmost && directSupervisor !== null;
    const hiddenSupervisorCount = poiManager.getHiddenSupervisorCount(d.data.id);

    const poiButtons = {
      expandSiblingsBtn: buildExpandSiblingsBtn(d.data.id, showExpandSiblings, siblingsExpanded, siblingCount),
      expandSupervisorChainBtn: buildExpandSupervisorChainBtn(showSupervisorChainBtn, poiManager.supervisorChainExpanded, hiddenSupervisorCount),
    };

    return renderNodeContent(d, {
      currentSchema: this.currentSchema,
      cardTemplate: this.cardTemplate,
      customTemplate: this.ctx.getCustomTemplate(),
      currentOptions: this.currentOptions,
      defaultOptions: this.ctx.getDefaultOptions(),
    }, poiButtons);
  }

  showNodeDetails(data: any): void {
    const detailsPanel = this.ctx.getDetailsPanel();
    if (!detailsPanel) return;
    detailsPanel.innerHTML = renderNodeDetails(data, this.ctx.instanceId);
    detailsPanel.style.display = 'block';
    detailsPanel.querySelector(`[data-id="ychart-node-details-close-${this.ctx.instanceId}"]`)
      ?.addEventListener('click', () => {
        detailsPanel.style.display = 'none';
      });
  }

  private initializeHeightSync(): void {
    const chartContainer = this.ctx.getChartContainer();
    if (!chartContainer) return;

    // Clean up existing service if any
    if (this.nodeHeightSync) {
      this.nodeHeightSync.destroy();
    }

    // Find the SVG container within the chart
    const svg = chartContainer.querySelector('svg');
    if (!svg) {
      console.warn('SVG not found for height sync');
      return;
    }

    const defaultOptions = this.ctx.getDefaultOptions();

    // Get the configured nodeHeight - use current options (from YAML) or default
    const configuredNodeHeight = this.currentOptions.nodeHeight || defaultOptions.nodeHeight || 110;

    // Initialize the height sync service with fixed height from options
    this.nodeHeightSync = new NodeHeightSyncService(svg, {
      fixedHeight: configuredNodeHeight,
      minHeight: configuredNodeHeight,
      maxHeight: 500,
      heightPadding: 0,
      resizeDebounce: 250,
      onHeightChange: (newHeight) => {
        if (import.meta.env?.DEV) {
          console.log(`Node heights synchronized to: ${newHeight}px`);
        }

        if (this.orgChart) {
          requestAnimationFrame(() => {
            this.orgChart?.nodeHeight(() => newHeight);
            this.orgChart?.updateHtmlOverlay?.();
          });
        }
      }
    });

    // Perform initial sync
    this.nodeHeightSync.init();
  }

  destroy(): void {
    if (this.forceGraph) {
      this.forceGraph.stop();
    }
    if (this.nodeHeightSync) {
      this.nodeHeightSync.destroy();
    }
  }
}
