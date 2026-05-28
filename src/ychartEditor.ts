import { EditorView } from 'codemirror';
import * as jsyaml from 'js-yaml';
import { OrgChart } from './d3-org-chart.js';
import './styles/ychart-lib-entry.scss';

import {
  // Types & constants
  YCHART_VERSION,
  generateUUID,
  // Data
  parseFrontMatter as parseFrontMatterFn,
  resolveMissingParentIds as resolveMissingParentIdsFn,
  // Visualization
  ForceGraph,
  applyBackgroundPattern,
  setupPatternPersistence,
  // UI
  createToolbar as createToolbarFn,
  toolbarIcons,
  SearchManager,
  ColumnAdjustManager,
  SidebarManager,
  SwapHandler,
  ShortcutManager,
  ShadowDOMManager,
  unmountAllReactRoots,
  // Editor
  createEditor,
  updateErrorBanner,
  jumpToEditorLine,
  formatYAML,
  // Node rendering
  buildExpandSiblingsBtn,
  buildExpandSupervisorChainBtn,
  renderNodeContent,
  renderNodeDetails,
  // Layout
  buildLayout,
  // POI
  POIManager,
  // Services
  NodeHeightSyncService,
} from './modules';
import type { YChartOptions, SchemaDefinition, CardElement, FrontMatter, NodeCoordinates } from './modules';

interface StylesheetReadyState {
  ready: Promise<void>;
  pending: boolean;
}

function isStylesheetLoaded(stylesheet: HTMLLinkElement): boolean {
  if (stylesheet.dataset.ychartStylesheetLoaded === 'true') {
    return true;
  }

  return stylesheet.sheet !== null;
}

function waitForStylesheet(stylesheet: HTMLLinkElement): StylesheetReadyState {
  if (isStylesheetLoaded(stylesheet)) {
    return { ready: Promise.resolve(), pending: false };
  }

  const ready = new Promise<void>((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      stylesheet.dataset.ychartStylesheetLoaded = 'true';
      stylesheet.removeEventListener('load', finish);
      stylesheet.removeEventListener('error', finish);
      resolve();
    };

    stylesheet.addEventListener('load', finish);
    stylesheet.addEventListener('error', finish);
    window.setTimeout(finish, 2000);
  });

  return { ready, pending: true };
}

function ensureYChartStylesheet(): StylesheetReadyState {
  if (typeof document === 'undefined') {
    return { ready: Promise.resolve(), pending: false };
  }

  const existingStylesheet = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]'))
    .find((link) => /\/ychart(?:-editor)?\.css(?:$|[?#])/.test(link.href));

  if (existingStylesheet) {
    return waitForStylesheet(existingStylesheet);
  }

  const currentScript = document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : Array.from(document.scripts).find((script) => /\/ychart-editor\.js(?:$|[?#])/.test(script.src));

  if (!currentScript?.src) {
    return { ready: Promise.resolve(), pending: false };
  }

  const stylesheetUrl = new URL(currentScript.src, document.baseURI);
  stylesheetUrl.pathname = stylesheetUrl.pathname.replace(/\/[^/]*$/, '/ychart.css');

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = stylesheetUrl.toString();
  stylesheet.dataset.ychartStylesheet = 'auto';
  document.head.appendChild(stylesheet);

  return waitForStylesheet(stylesheet);
}

ensureYChartStylesheet();


class YChartEditor {
  private viewContainer: HTMLElement | null = null;
  private editorContainer: HTMLElement | null = null;
  private chartContainer: HTMLElement | null = null;
  private editor: EditorView | null = null;
  private orgChart: any = null;
  private forceGraph: ForceGraph | null = null;
  private currentView: 'hierarchy' | 'force' = 'hierarchy';
  private swapHandler!: SwapHandler;
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
  private columnAdjustManager!: ColumnAdjustManager;
  private experimental = false;
  private instanceId: string;
  private errorBanner: HTMLElement | null = null;
  private searchManager!: SearchManager;
  private poiManager!: POIManager;
  private sidebarManager!: SidebarManager;
  private shortcutManager!: ShortcutManager;

  // Default supervisor field aliases - can be overridden via schema or supervisorLookup()
  private supervisorFields: string[] = ['supervisor', 'reports', 'reports_to', 'manager', 'leader', 'parent'];
  private nameField: string = 'name';
  private nodeHeightSync: NodeHeightSyncService | null = null;
  private chartResizeObserver: ResizeObserver | null = null;
  private chartResizeFrame: number | null = null;
  private lastChartSize = { width: 0, height: 0 };
  // Current merged options (defaultOptions + YAML options)
  private currentOptions: YChartOptions = {};
  // Truth data (complete YAML data)
  private truthData: any[] = [];
  // Shadow DOM support
  private shadowDomManager!: ShadowDOMManager;
  
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
    const hostContainer = typeof containerIdOrElement === 'string'
      ? document.getElementById(containerIdOrElement)
      : containerIdOrElement;

    if (!hostContainer) {
      throw new Error(`Container not found: ${containerIdOrElement}`);
    }

    this.initialData = yamlData;

    // Set up Shadow DOM if enabled
    this.shadowDomManager = new ShadowDOMManager(this.defaultOptions.useShadowDOM || false);
    this.viewContainer = this.shadowDomManager.attachTo(hostContainer);

    // Create the layout structure
    this.createLayout();
    
    // Initialize the editor
    this.initializeEditor();
    
    // Set up keyboard shortcuts
    this.shortcutManager = new ShortcutManager({
      getSidebarManager: () => this.sidebarManager,
      getSearchManager: () => this.searchManager,
    });
    this.shortcutManager.init();
    
    // Set up expand siblings handlers for POI feature
    this.poiManager.setupExpandSiblingsHandlers();

    // Start collapsed before the first render so chart dimensions are measured once.
    this.sidebarManager.collapse(true);

    const renderInitialChart = (): void => {
      this.renderChart();

      // eslint-disable-next-line no-console -- Intentional: Display version on successful init
      console.log(`%cYChart Editor v${YCHART_VERSION}%c initialized successfully${this.shadowDomManager.isEnabled() ? ' (Shadow DOM)' : ''}`, 'color: #667eea; font-weight: bold;', 'color: inherit;');
    };

    const stylesheet = ensureYChartStylesheet();
    if (stylesheet.pending) {
      const initialVisibility = this.viewContainer.style.visibility;
      this.viewContainer.style.visibility = 'hidden';
      stylesheet.ready.then(() => {
        if (!this.viewContainer) return;
        this.viewContainer.style.visibility = initialVisibility;
        renderInitialChart();
      });
    } else {
      renderInitialChart();
    }

    return this;
  
}

  /**
   * Load new YAML data into the editor and re-render the chart
   */
  loadYaml(yamlData: string): this {
    if (!this.editor) {
      throw new Error('Editor not initialized. Call initView first.');
    }

    // Update editor content
    this.editor.dispatch({
      changes: {
        from: 0,
        to: this.editor.state.doc.length,
        insert: yamlData
      }
    });

    // Re-render the chart
    this.renderChart();

    return this;
  }

  private createLayout(): void {
    if (!this.viewContainer) return;

    // Create sidebar manager
    this.sidebarManager = new SidebarManager({
      instanceId: this.instanceId,
      getEditor: () => this.editor,
      getOrgChart: () => this.orgChart,
      getChartContainer: () => this.chartContainer,
      getBgPattern: () => this.bgPattern,
      getPatternColor: () => this.defaultOptions.patternColor,
    });

    // Create swap handler
    this.swapHandler = new SwapHandler({
      instanceId: this.instanceId,
      getEditor: () => this.editor,
      getOrgChart: () => this.orgChart,
      getRootContainer: () => this.viewContainer,
      parseFrontMatter: (content: string) => this.parseFrontMatter(content),
      setIsUpdatingProgrammatically: (value: boolean) => { this.isUpdatingProgrammatically = value; },
    });

    const layout = buildLayout(this.viewContainer, {
      instanceId: this.instanceId,
      collapsible: this.defaultOptions.collapsible ?? true,
      onToggleEditor: () => this.sidebarManager.toggle(),
      onFormatYAML: () => this.handleFormatYAML(),
    });

    this.chartContainer = layout.chartContainer;
    this.detailsPanel = layout.detailsPanel;
    this.editorContainer = layout.editorContainer;
    this.errorBanner = layout.errorBanner;
    this.initializeChartResizeObserver();

    // Create toolbar
    this.columnAdjustManager = new ColumnAdjustManager({
      instanceId: this.instanceId,
      getChartContainer: () => this.chartContainer,
      getOrgChart: () => this.orgChart,
    });
    this.toolbar = this.createToolbar();
    layout.chartWrapper.appendChild(this.toolbar);

    // Create search manager
    this.searchManager = new SearchManager({
      instanceId: this.instanceId,
      getOrgChart: () => this.orgChart,
      getTruthData: () => this.truthData,
      getCurrentSchema: () => this.currentSchema,
      getChartContainer: () => this.chartContainer,
      getPersonOfInterest: () => this.poiManager.personOfInterest,
      setPersonOfInterest: (id: string) => this.poiManager.setPersonOfInterest(id),
      updatePOISelectorValue: (id: string) => this.poiManager.updatePOISelectorValue(id),
      resetToRoot: () => this.poiManager.resetToRoot(),
    });
    const floatingSearchBar = this.searchManager.createFloatingSearchBar();
    layout.chartWrapper.appendChild(floatingSearchBar);
    this.searchManager.createSearchPopup();

    // Create POI manager & selector
    this.poiManager = new POIManager({
      instanceId: this.instanceId,
      getOrgChart: () => this.orgChart,
      getTruthData: () => this.truthData,
      getSupervisorFields: () => this.supervisorFields,
      getNameField: () => this.nameField,
      getChartContainer: () => this.chartContainer,
      renderChart: () => this.renderChart(),
    });
    layout.chartWrapper.appendChild(this.poiManager.createPOISelector());
  }

        private createToolbar(): HTMLElement {
    return createToolbarFn({
      instanceId: this.instanceId,
      position: this.toolbarPosition,
      orientation: this.toolbarOrientation,
      experimental: this.experimental,
      currentView: this.currentView,
      swapModeEnabled: this.swapHandler?.enabled ?? false,
      columnAdjustMode: this.columnAdjustManager?.isActive ?? false,
      actions: {
        handleFit: () => this.handleFit(),
        handleReset: () => this.handleReset(),
        handleExpandAll: () => this.handleExpandAll(),
        handleCollapseAll: () => this.handleCollapseAll(),
        handleColumnAdjustToggle: () => this.columnAdjustManager.toggle(),
        handleSwapToggle: () => this.handleSwapToggle(),
        handleExport: () => this.handleExport(),
        handleToggleView: () => this.handleToggleView(),
      },
    });
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
    this.swapHandler.toggle();
  }

  private handleToggleView(): void {
    if (this.currentView === 'hierarchy') {
      this.renderForceGraph();
    } else {
      this.renderChart();
    }

    // Update the toggle view button icon and tooltip
    const toggleBtn = this.viewContainer?.querySelector(`[data-id="ychart-btn-toggleView-${this.instanceId}"]`) as HTMLElement | null;
    if (toggleBtn) {
      if (this.currentView === 'hierarchy') {
        toggleBtn.innerHTML = toolbarIcons.forceGraph;
        toggleBtn.title = 'Switch to Force Graph';
      } else {
        toggleBtn.innerHTML = toolbarIcons.orgChart;
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
    formatYAML(this.editor);
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

  private initializeEditor(): void {
    if (!this.editorContainer) return;

    this.editor = createEditor(
      this.editorContainer,
      this.initialData,
      this.defaultOptions.editorTheme,
      (content: string) => this.parseFrontMatter(content),
      (diagnostics, view) => {
        if (this.errorBanner) {
          updateErrorBanner(this.errorBanner, diagnostics, view, (line) => this.jumpToLine(line));
        }
      },
      () => {
        if (!this.isUpdatingProgrammatically) {
          this.renderChart();
        }
      },
    );
  }



  /**
   * Jump to a specific line in the editor
   */
  private jumpToLine(lineNumber: number): void {
    if (!this.editor) return;
    jumpToEditorLine(this.editor, lineNumber);
  }

    private parseFrontMatter(content: string): FrontMatter {
    const result = parseFrontMatterFn(content, this.supervisorFields);
    if (result.updatedSupervisorFields) {
      this.supervisorFields = result.updatedSupervisorFields;
    }
    return result;
  }

            private resolveMissingParentIds(data: any[]): any[] {
    return resolveMissingParentIdsFn(data, this.nameField, this.supervisorFields);
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

  /**
   * Set the initial Person of Interest (POI) programmatically.
   * @param selfValue - The id, name, email, or any field value that identifies the person.
   */
  self(selfValue: string | number | null): this {
    if (selfValue === null || selfValue === '') {
      this.poiManager.initialSelf = null;
      this.poiManager.selfApplied = false;
      if (this.orgChart && this.truthData.length > 0) {
        this.poiManager.setPersonOfInterest('');
      }
      return this;
    }

    this.poiManager.initialSelf = selfValue;
    this.poiManager.selfApplied = false;

    if (this.orgChart && this.truthData.length > 0) {
      const personId = this.poiManager.resolveSelfToPersonId(selfValue);
      if (personId) {
        this.poiManager.setPersonOfInterest(personId);
      }
      this.poiManager.selfApplied = true;
    }

    return this;
  }

  private renderChart(): void {
    try {
      if (this.forceGraph) {
        this.forceGraph.stop();
        this.forceGraph = null;
        this.orgChart = null;
        this.chartContainer?.replaceChildren();
      }

      if (!this.editor) return;

      const yamlContent = this.editor.state.doc.toString();
      const { options: userOptions, schema: schemaDef, card: cardDef, data: yamlData } = this.parseFrontMatter(yamlContent);
      const options = { ...this.defaultOptions, ...userOptions };
      
      // Store current merged options for use by other methods (e.g., initializeHeightSync)
      this.currentOptions = options;
      
      // Capture 'self' option for initial POI (only on first render)
      if (!this.poiManager.selfApplied && options.self !== undefined) {
        this.poiManager.initialSelf = options.self;
      }
      
      let parsedData = jsyaml.load(yamlData);

      // Store current schema and card template for template access
      this.currentSchema = schemaDef;
      this.cardTemplate = cardDef || null;

      if (!Array.isArray(parsedData)) {
        throw new Error('YAML must be an array');
      }

      // Resolve missing parentId values by looking up supervisor names
      const resolvedData = this.resolveMissingParentIds(parsedData);

      // Store truth data (complete YAML) for POI filtering comparisons
      this.truthData = resolvedData;

      this.poiManager.applyInitialSelfBeforeRender();

      // Update POI selector with all people from truth data
      this.poiManager.updatePOISelector(resolvedData);

      // Build virtual data list - filters based on POI and expanded siblings
      const virtualData = this.poiManager.buildVirtualData(resolvedData);

      const isInitialHierarchyRender = !this.orgChart;
      if (!this.orgChart) {
        this.orgChart = new OrgChart();
      }

      const initialRenderDuration = isInitialHierarchyRender ? this.orgChart.duration?.() : undefined;
      if (isInitialHierarchyRender) {
        this.orgChart.duration?.(0);
      }

      if (!this.chartContainer) return;

      this.orgChart
        .container(this.chartContainer)
        .data(virtualData)
        .nodeHeight(() => options.nodeHeight!)
        .nodeWidth(() => options.nodeWidth!)
        .childrenMargin(() => options.childrenMargin!)
        .compactMarginBetween(() => options.compactMarginBetween!)
        .compactMarginPair(() => options.compactMarginPair!)
        .neighbourMargin(() => options.neighbourMargin!)
        .onNodeClick((d: any, _i: number, _arr: any) => {
          // Handle column adjust mode first
          if (this.columnAdjustManager.isActive) {
            this.columnAdjustManager.handleNodeClick(d);
          }
          // Default: do nothing (selection is handled by d3-org-chart)
        })
        .onNodeDetailsClick((d: any) => {
          this.showNodeDetails(d.data);
        })
        .nodeContent((d: any) => this.getNodeContent(d))
        .render();

      if (isInitialHierarchyRender) {
        this.orgChart.fit({ animate: false });
        if (initialRenderDuration !== undefined) {
          this.orgChart.duration?.(initialRenderDuration);
        }
      }
      
      // Set up pattern persistence observer (always, it will only act if bgPattern is set)
      setupPatternPersistence(this.chartContainer!, () => this.bgPattern, this.defaultOptions.patternColor);
      
      // Apply pattern immediately after render
      if (this.bgPattern) {
        // Small delay to ensure SVG is ready
        setTimeout(() => applyBackgroundPattern(this.chartContainer!, this.bgPattern!, this.defaultOptions.patternColor), 10);
      }
      
      // Fit to container bounds after render completes
      setTimeout(() => {
        if (this.orgChart && this.chartContainer) {
          if (!isInitialHierarchyRender) {
            this.orgChart.fit();
          }
          
          // Reapply pattern after fit to ensure it persists
          if (this.bgPattern) {
            applyBackgroundPattern(this.chartContainer!, this.bgPattern!, this.defaultOptions.patternColor);
          }
          
          // Initialize height synchronization after nodes are rendered
          this.initializeHeightSync();
          
          // Apply initial 'self' POI if set in options (only once)
          this.poiManager.applyInitialSelf();
        }
      }, 100);
      
      this.currentView = 'hierarchy';
    } catch (error) {
      // Silently handle - linter will display errors in the editor
    }
  }

  private getNodeContent(d: any): string {
    const showExpandSiblings = this.poiManager.shouldShowExpandSiblings(d.data.id);
    const siblingsExpanded = this.poiManager.expandedSiblings.has(String(d.data.id));
    const siblingCount = showExpandSiblings ? this.poiManager.getSiblingCount(d.data.id) : 0;

    const { directSupervisor } = this.poiManager.getSupervisorChainInfo();
    const isTopmost = this.poiManager.isTopmostVisibleSupervisor(d.data.id);
    const showSupervisorChainBtn = isTopmost && directSupervisor !== null;
    const hiddenSupervisorCount = this.poiManager.getHiddenSupervisorCount(d.data.id);

    const poiButtons = {
      expandSiblingsBtn: buildExpandSiblingsBtn(d.data.id, showExpandSiblings, siblingsExpanded, siblingCount),
      expandSupervisorChainBtn: buildExpandSupervisorChainBtn(showSupervisorChainBtn, this.poiManager.supervisorChainExpanded, hiddenSupervisorCount),
    };

    return renderNodeContent(d, {
      currentSchema: this.currentSchema,
      cardTemplate: this.cardTemplate,
      customTemplate: this.customTemplate,
      currentOptions: this.currentOptions,
      defaultOptions: this.defaultOptions,
    }, poiButtons);
  }

  private showNodeDetails(data: any): void {
    if (!this.detailsPanel) return;
    this.detailsPanel.innerHTML = renderNodeDetails(data, this.instanceId);
    this.detailsPanel.style.display = 'block';
    this.detailsPanel.querySelector(`[data-id="ychart-node-details-close-${this.instanceId}"]`)
      ?.addEventListener('click', () => {
        if (this.detailsPanel) {
          this.detailsPanel.style.display = 'none';
        }
      });
  }

  private initializeChartResizeObserver(): void {
    if (!this.chartContainer || typeof ResizeObserver === 'undefined') return;

    this.chartResizeObserver?.disconnect();
    const rect = this.chartContainer.getBoundingClientRect();
    this.lastChartSize = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    this.chartResizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width <= 0 || height <= 0) return;
      if (width === this.lastChartSize.width && height === this.lastChartSize.height) return;

      this.lastChartSize = { width, height };
      this.scheduleChartResize();
    });

    this.chartResizeObserver.observe(this.chartContainer);
  }

  private scheduleChartResize(): void {
    if (this.chartResizeFrame !== null) {
      cancelAnimationFrame(this.chartResizeFrame);
    }

    this.chartResizeFrame = requestAnimationFrame(() => {
      this.chartResizeFrame = null;
      this.handleChartResize();
    });
  }

  private handleChartResize(): void {
    if (!this.chartContainer) return;

    const width = this.chartContainer.clientWidth;
    const height = this.chartContainer.clientHeight;
    if (width <= 0 || height <= 0) return;

    if (this.currentView === 'force') {
      this.forceGraph?.resize();
      return;
    }

    if (!this.orgChart) return;

    this.orgChart.svgWidth?.(width);
    this.orgChart.svgHeight?.(height);
    this.orgChart.render().fit();
    this.orgChart.updateHtmlOverlay?.();

    if (this.bgPattern) {
      applyBackgroundPattern(this.chartContainer, this.bgPattern, this.defaultOptions.patternColor);
    }
  }

          /**
   * Initialize node height synchronization service
   * Ensures all nodes have the same height based on the configured nodeHeight option
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

    // Get the configured nodeHeight - use current options (from YAML) or default
    const configuredNodeHeight = this.currentOptions.nodeHeight || this.defaultOptions.nodeHeight || 110;

    // Initialize the height sync service with fixed height from options
    this.nodeHeightSync = new NodeHeightSyncService(svg, {
      fixedHeight: configuredNodeHeight, // Use configured nodeHeight as the fixed height
      minHeight: configuredNodeHeight,   // Also set as minimum for safety
      maxHeight: 500, // Reasonable max to prevent excessive heights
      heightPadding: 0, // No extra padding since we're using fixed height
      resizeDebounce: 250, // Longer debounce for stability
      onHeightChange: (newHeight) => {
        // Only log in dev mode to reduce noise
        if (import.meta.env?.DEV) {
          console.log(`Node heights synchronized to: ${newHeight}px`);
        }
        
        // Update the org chart's node height setting
        // Use requestAnimationFrame to avoid interrupting render cycle
        if (this.orgChart) {
          requestAnimationFrame(() => {
            this.orgChart?.nodeHeight(() => newHeight);
            // Update the HTML overlay to reposition buttons after height change
            this.orgChart?.updateHtmlOverlay?.();
          });
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
      this.orgChart = null;

      if (!this.chartContainer) return;

      this.forceGraph = new ForceGraph(this.chartContainer, (data: any) => this.showNodeDetails(data));
      this.forceGraph.render(resolvedData);
      
      this.currentView = 'force';
    } catch (error) {
      // Silently handle - linter will display errors in the editor
    }
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
   * Get the Shadow DOM root if Shadow DOM is enabled
   */
  getShadowRoot(): ShadowRoot | null {
    return this.shadowDomManager?.getRoot() ?? null;
  }

  /**
   * Check if Shadow DOM is enabled
   */
  isShadowDOMEnabled(): boolean {
    return this.shadowDomManager?.isEnabled() ?? false;
  }

  /**
   * Get the XY coordinates and dimensions of all visible nodes on the canvas.
   * Returns positions in the chart's internal coordinate space (pre-zoom/pan transform).
   *
   * In hierarchy mode, positions are deterministic based on the tree layout.
   * In force mode, positions reflect the current simulation state and may shift until the simulation settles.
   *
   * @returns Array of node coordinates, or an empty array if the chart is not initialized.
   */
  getNodeCoordinates(): NodeCoordinates[] {
    if (this.currentView === 'force' && this.forceGraph) {
      return this.forceGraph.getNodes().map(n => ({
        id: n.id,
        x: n.x ?? 0,
        y: n.y ?? 0,
        width: 80,
        height: 80,
      }));
    }

    if (!this.orgChart) return [];
    const attrs = this.orgChart.getChartState();
    if (!attrs?.allNodes) return [];

    return attrs.allNodes.map((node: any) => ({
      id: attrs.nodeId(node.data),
      x: node.x,
      y: node.y,
      width: node.width ?? this.defaultOptions.nodeWidth ?? 0,
      height: node.height ?? this.defaultOptions.nodeHeight ?? 0,
    }));
  }

  /**
   * Get the XY coordinates and dimensions of a single node by its ID.
   * Returns null if the node is not found or the chart is not initialized.
   *
   * @param nodeId - The unique identifier of the node.
   * @returns The node's coordinates, or null if not found.
   */
  getNodeCoordinateById(nodeId: string | number): NodeCoordinates | null {
    const all = this.getNodeCoordinates();
    return all.find(n => String(n.id) === String(nodeId)) ?? null;
  }

  /**
   * Destroy the instance and clean up
   */
  destroy(): void {
    if (this.shortcutManager) {
      this.shortcutManager.destroy();
    }
    if (this.forceGraph) {
      this.forceGraph.stop();
    }
    if (this.chartResizeFrame !== null) {
      cancelAnimationFrame(this.chartResizeFrame);
      this.chartResizeFrame = null;
    }
    if (this.chartResizeObserver) {
      this.chartResizeObserver.disconnect();
      this.chartResizeObserver = null;
    }
    if (this.editor) {
      this.editor.destroy();
    }
    if ((this as any)._patternObserver) {
      (this as any)._patternObserver.disconnect();
    }
    // Clean up all React roots
    unmountAllReactRoots();
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
