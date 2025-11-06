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
}

interface FieldSchema {
  type: string;
  required: boolean;
  missing: boolean;
}

interface SchemaDefinition {
  [fieldName: string]: FieldSchema;
}

interface FrontMatter {
  options: YChartOptions;
  schema: SchemaDefinition;
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
      ...options
    };
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
    this.chartContainer.style.cssText = 'flex:1;width:100%;height:100%;position:relative;overflow:auto;';
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
    this.editorContainer.style.cssText = 'width:400px;height:100%;overflow:auto;';
    editorSidebar.appendChild(this.editorContainer);

    // Create collapse button (positioned outside sidebar, on the left side of editor)
    if (this.defaultOptions.collapsible) {
      const collapseBtn = document.createElement('button');
      collapseBtn.id = 'ychart-collapse-editor';
      collapseBtn.innerHTML = '▶';
      collapseBtn.style.cssText = `
        position: absolute;
        right: 399px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1001;
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 5px;
        cursor: pointer;
        border-radius: 4px 0 0 4px;
        font-size: 14px;
        transition: right 0.3s ease;
      `;
      collapseBtn.onclick = () => this.toggleEditor();
      this.viewContainer.appendChild(collapseBtn);
    }

    // Append to main container (chart first, then editor)
    this.viewContainer.appendChild(chartWrapper);
    this.viewContainer.appendChild(editorSidebar);
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

    this.editor = new EditorView({
      doc: this.initialData,
      extensions,
      parent: this.editorContainer
    });
    
    // Force CodeMirror to take full height
    const cmElement = this.editorContainer.querySelector('.cm-editor') as HTMLElement;
    if (cmElement) {
      cmElement.style.height = '100%';
    }
    
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
          const schemaDef: SchemaDefinition = {};
          
          if (parsed.schema && typeof parsed.schema === 'object') {
            for (const [fieldName, fieldDef] of Object.entries(parsed.schema)) {
              if (typeof fieldDef === 'string') {
                schemaDef[fieldName] = this.parseSchemaField(fieldDef as string);
              }
            }
          }
          
          return { options, schema: schemaDef, data: yamlData };
        } catch (error) {
          console.error('Error parsing front matter:', error);
          return { options: {}, schema: {}, data: content };
        }
      }
    }
    return { options: {}, schema: {}, data: content };
  }

  private parseSchemaField(fieldDefinition: string): FieldSchema {
    const parts = fieldDefinition.split('|').map(p => p.trim());
    return {
      type: parts[0] || 'string',
      required: parts.includes('required'),
      missing: parts.includes('missing')
    };
  }

  private renderChart(): void {
    try {
      if (this.forceGraph) {
        this.forceGraph.stop();
        this.forceGraph = null;
      }

      if (!this.editor) return;

      const yamlContent = this.editor.state.doc.toString();
      const { options: userOptions, data: yamlData } = this.parseFrontMatter(yamlContent);
      const options = { ...this.defaultOptions, ...userOptions };
      const parsedData = jsyaml.load(yamlData);

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
      
      // Fit to container bounds after a small delay to ensure layout is ready
      setTimeout(() => {
        if (this.orgChart && this.chartContainer) {
          this.orgChart.fit();
        }
      }, 100);
      
      this.currentView = 'hierarchy';
    } catch (error) {
      console.error('Error rendering chart:', error);
    }
  }

  private getNodeContent(d: any): string {
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
   * Attach enable swap mode button
   */
  enableSwapBtn(btnIdOrElement: string | HTMLElement): this {
    const btn = typeof btnIdOrElement === 'string'
      ? document.getElementById(btnIdOrElement)
      : btnIdOrElement;

    if (!btn) {
      console.warn(`Swap button not found: ${btnIdOrElement}`);
      return this;
    }

    btn.addEventListener('click', () => {
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

      if (this.swapModeEnabled) {
        btn.textContent = 'Disable Swap Mode';
        btn.style.background = '#e74c3c';
      } else {
        btn.textContent = 'Enable Swap Mode';
        btn.style.background = '#667eea';
      }
    });

    return this;
  }

  /**
   * Attach reset position button
   */
  resetBtn(btnIdOrElement: string | HTMLElement): this {
    const btn = typeof btnIdOrElement === 'string'
      ? document.getElementById(btnIdOrElement)
      : btnIdOrElement;

    if (!btn) {
      console.warn(`Reset button not found: ${btnIdOrElement}`);
      return this;
    }

    btn.addEventListener('click', () => {
      this.renderChart();
    });

    return this;
  }

  /**
   * Attach export SVG button
   */
  exportSVGBtn(btnIdOrElement: string | HTMLElement): this {
    const btn = typeof btnIdOrElement === 'string'
      ? document.getElementById(btnIdOrElement)
      : btnIdOrElement;

    if (!btn) {
      console.warn(`Export button not found: ${btnIdOrElement}`);
      return this;
    }

    btn.addEventListener('click', () => {
      if (this.orgChart && typeof this.orgChart.exportSvg === 'function') {
        this.orgChart.exportSvg();
      }
    });

    return this;
  }

  /**
   * Attach toggle view button (hierarchy/force)
   */
  toggleViewBtn(btnIdOrElement: string | HTMLElement): this {
    const btn = typeof btnIdOrElement === 'string'
      ? document.getElementById(btnIdOrElement)
      : btnIdOrElement;

    if (!btn) {
      console.warn(`Toggle view button not found: ${btnIdOrElement}`);
      return this;
    }

    btn.addEventListener('click', () => {
      if (this.currentView === 'hierarchy') {
        this.renderForceGraph();
        btn.textContent = 'Hierarchy View';
      } else {
        this.renderChart();
        btn.textContent = 'Force Graph';
      }
    });

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
