import cytoscape, { type Core, type NodeSingular, type StylesheetStyle } from 'cytoscape';

export interface ReactFlowNode {
  id: string;
  name: string;
  title?: string;
  email?: string;
  department?: string;
  parentId?: string | number;
  [key: string]: any;
}

export class ReactFlowView {
  private cy: Core | null = null;
  private container: HTMLElement | null = null;
  private onNodeClick?: (data: any) => void;

  constructor(containerId: string, onNodeClick?: (data: any) => void) {
    this.container = document.getElementById(containerId);
    this.onNodeClick = onNodeClick;
  }

  render(data: any[]) {
    if (!this.container) {
      throw new Error('Container not found');
    }

    // Clear the container
    this.container.innerHTML = '';

    // Destroy existing instance
    if (this.cy) {
      this.cy.destroy();
    }

    // Create nodes array
    const nodes: ReactFlowNode[] = data.map(d => ({
      id: String(d.id),
      ...d
    }));

    // Create a Set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map(n => n.id));

    // Create edges from parent-child relationships
    const edges = data
      .filter(d => d.parentId !== undefined && d.parentId !== null)
      .map(d => ({
        source: String(d.parentId),
        target: String(d.id)
      }))
      .filter(edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target));

    // Initialize Cytoscape
    this.cy = cytoscape({
      container: this.container,
      
      elements: {
        nodes: nodes.map(node => ({
          data: {
            ...node,
            label: node.name
          }
        })),
        edges: edges.map(edge => ({
          data: {
            id: `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target
          }
        }))
      },

      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#667eea',
            'label': 'data(label)',
            'width': 80,
            'height': 80,
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#333',
            'font-size': 12,
            'font-weight': 'bold',
            'text-wrap': 'wrap',
            'text-max-width': 70,
            'border-width': 3,
            'border-color': '#fff',
            'overlay-padding': 6,
            'z-index': 10
          }
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#f59e0b',
            'border-color': '#667eea',
            'border-width': 4
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.5
          }
        }
      ] as StylesheetStyle[],

      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        spacingFactor: 1.5,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true
      },

      wheelSensitivity: 0.2,
      minZoom: 0.1,
      maxZoom: 3
    });

    // Add click handler
    if (this.onNodeClick) {
      this.cy.on('tap', 'node', (event) => {
        const node = event.target as NodeSingular;
        const nodeData = node.data();
        this.onNodeClick?.(nodeData);
      });
    }

    // Add double-click to fit
    this.cy.on('dblclick', () => {
      this.cy?.fit(undefined, 50);
    });

    // Fit the graph to view
    this.cy.fit(undefined, 50);
  }

  stop() {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }

  resize() {
    if (this.cy) {
      this.cy.resize();
      this.cy.fit(undefined, 50);
    }
  }
}
