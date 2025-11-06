import * as d3 from 'd3';

export interface ForceGraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  title?: string;
  email?: string;
  department?: string;
  parentId?: string | number;
  [key: string]: any;
}

export interface ForceGraphLink extends d3.SimulationLinkDatum<ForceGraphNode> {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
}

export class ForceGraph {
  private simulation: d3.Simulation<ForceGraphNode, ForceGraphLink> | null = null;
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

    // Stop any existing simulation
    if (this.simulation) {
      this.simulation.stop();
    }

    // Get container dimensions
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Create nodes with proper id mapping
    const nodes: ForceGraphNode[] = data.map(d => ({
      id: String(d.id),
      ...d
    }));

    // Create a Set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map(n => n.id));

    // Create links from parent-child relationships
    const links: ForceGraphLink[] = data
      .filter(d => d.parentId !== undefined && d.parentId !== null)
      .map(d => ({
        source: String(d.parentId),
        target: String(d.id)
      }))
      .filter(link => validNodeIds.has(link.source) && validNodeIds.has(link.target));

    console.log('Total nodes:', nodes.length);
    console.log('Total links:', links.length);
    console.log('Sample links:', links.slice(0, 5));

    // Create SVG
    const svg = d3.select(this.container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', 'linear-gradient(to bottom, #fafbfc 0%, #f5f7fa 100%)');

    // Add zoom behavior
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<ForceGraphNode, ForceGraphLink>(links)
        .id((d: ForceGraphNode) => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, ForceGraphNode>()
        .on('start', (event, d) => this.dragstarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragended(event, d)) as any);

    // Add circles to nodes
    node.append('circle')
      .attr('r', 40)
      .attr('fill', '#4A90E2')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);

    // Add text labels
    node.append('text')
      .text((d: ForceGraphNode) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 60)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none');

    // Add title (tooltip)
    node.append('title')
      .text((d: ForceGraphNode) => `${d.name}\n${d.title || ''}\n${d.email || ''}`);

    // Add click handler
    if (this.onNodeClick) {
      node.on('click', (_event, d) => {
        this.onNodeClick?.(d);
      });
    }

    // Update positions on each tick
    this.simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: ForceGraphNode) => `translate(${d.x},${d.y})`);
    });
  }

  private dragstarted(event: d3.D3DragEvent<SVGGElement, ForceGraphNode, ForceGraphNode>, d: ForceGraphNode) {
    if (!event.active && this.simulation) {
      this.simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: d3.D3DragEvent<SVGGElement, ForceGraphNode, ForceGraphNode>, d: ForceGraphNode) {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragended(event: d3.D3DragEvent<SVGGElement, ForceGraphNode, ForceGraphNode>, d: ForceGraphNode) {
    if (!event.active && this.simulation) {
      this.simulation.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }

  stop() {
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
  }
}
