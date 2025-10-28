import './style.css';
import { EditorView, basicSetup } from 'codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import * as jsyaml from 'js-yaml';
import { OrgChart } from 'd3-org-chart';
import orgChartDataRaw from './orgchart.yaml?raw';
import * as d3 from 'd3';

// Sample YAML data with front matter for options and schema configuration
const defaultYAML = `---
options:
  nodeWidth: 150
  nodeHeight: 80
  childrenMargin: 50
  compactMarginBetween: 35
  compactMarginPair: 30
  neighbourMargin: 20
schema:
  id: number | required
  name: string | required
  title: string | optional
  department: string | optional | missing
  email: string | required
---

${orgChartDataRaw}`;

// Initialize CodeMirror editor
const editorContainer = document.getElementById('editor')!;
const editor = new EditorView({
  doc: defaultYAML,
  extensions: [
    basicSetup,
    yaml(),
    oneDark,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        renderChart();
      }
    }),
  ],
  parent: editorContainer,
});

// Initialize org chart
let orgChart: any = null;
let currentView: 'hierarchy' | 'force' = 'hierarchy';
let forceSimulation: any = null;

// Local storage key for node positions
const POSITION_STORAGE_KEY = 'orgchart-node-positions';

// Load saved positions from localStorage
function loadNodePositions(): Map<string, { x: number; y: number }> {
  const saved = localStorage.getItem(POSITION_STORAGE_KEY);
  if (saved) {
    try {
      const obj = JSON.parse(saved);
      return new Map(Object.entries(obj));
    } catch (e) {
      console.error('Failed to parse saved positions:', e);
    }
  }
  return new Map();
}

// Save positions to localStorage
function saveNodePositions(positions: Map<string, { x: number; y: number }>) {
  const obj = Object.fromEntries(positions);
  localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(obj));
}

// Track custom node positions
const customNodePositions = loadNodePositions();

// Default options configuration
const defaultOptions = {
  nodeWidth: 220,
  nodeHeight: 110,
  childrenMargin: 50,
  compactMarginBetween: 35,
  compactMarginPair: 30,
  neighbourMargin: 20,
};

interface OptionsConfig {
  nodeWidth?: number;
  nodeHeight?: number;
  childrenMargin?: number;
  compactMarginBetween?: number;
  compactMarginPair?: number;
  neighbourMargin?: number;
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
  options: OptionsConfig;
  schema: SchemaDefinition;
  data: string;
}

function parseSchemaField(fieldDefinition: string): FieldSchema {
  // Parse format like: "string | required" or "number | optional | missing"
  const parts = fieldDefinition.split('|').map(p => p.trim());
  const type = parts[0] || 'string';
  const isRequired = parts.includes('required');
  const isMissing = parts.includes('missing');
  
  return {
    type,
    required: isRequired,
    missing: isMissing,
  };
}

function parseFrontMatter(content: string): FrontMatter {
  // Check if content has front matter
  if (content.startsWith('---')) {
    const parts = content.split('---');
    if (parts.length >= 3) {
      const frontMatter = parts[1].trim();
      const yamlData = parts.slice(2).join('---').trim();
      
      try {
        const parsed = jsyaml.load(frontMatter) as any;
        
        // Parse options
        const options = parsed.options || {};
        
        // Parse schema definitions
        const schemaDef: SchemaDefinition = {};
        if (parsed.schema && typeof parsed.schema === 'object') {
          for (const [fieldName, fieldDef] of Object.entries(parsed.schema)) {
            if (typeof fieldDef === 'string') {
              schemaDef[fieldName] = parseSchemaField(fieldDef);
            }
          }
        }
        
        return {
          options,
          schema: schemaDef,
          data: yamlData,
        };
      } catch (error) {
        console.error('Error parsing front matter:', error);
        return { options: {}, schema: {}, data: content };
      }
    }
  }
  return { options: {}, schema: {}, data: content };
}

function validateData(data: any[], schema: SchemaDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // If no schema defined, skip validation
  if (Object.keys(schema).length === 0) {
    return { valid: true, errors: [] };
  }
  
  data.forEach((item, index) => {
    // Check required fields
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const fieldExists = fieldName in item;
      const fieldValue = item[fieldName];
      
      // Required fields must exist
      if (fieldDef.required && !fieldExists) {
        errors.push(`Item ${index + 1}: Missing required field "${fieldName}"`);
        continue;
      }
      
      // If field doesn't exist and it's not required, that's fine (optional or missing)
      if (!fieldExists) {
        continue;
      }
      
      // Check type if field exists and has a value (not null/undefined)
      if (fieldValue !== undefined && fieldValue !== null) {
        const actualType = typeof fieldValue;
        
        if (fieldDef.type === 'number' && actualType !== 'number') {
          errors.push(`Item ${index + 1}: Field "${fieldName}" should be a number, got ${actualType}`);
        } else if (fieldDef.type === 'string' && actualType !== 'string') {
          errors.push(`Item ${index + 1}: Field "${fieldName}" should be a string, got ${actualType}`);
        } else if (fieldDef.type === 'boolean' && actualType !== 'boolean') {
          errors.push(`Item ${index + 1}: Field "${fieldName}" should be a boolean, got ${actualType}`);
        }
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

function renderChart() {
  try {
    // Parse YAML with front matter
    const yamlContent = editor.state.doc.toString();
    const { options: userOptions, schema: schemaDef, data: yamlData } = parseFrontMatter(yamlContent);
    
    // Merge user options with defaults
    const options = { ...defaultOptions, ...userOptions };
    
    // Parse the data part
    const parsedData = jsyaml.load(yamlData);

    if (!Array.isArray(parsedData)) {
      showError('YAML must be an array of employees with id and parentId fields');
      return;
    }

    if (parsedData.length === 0) {
      showError('YAML array is empty');
      return;
    }

    // Validate data against schema
    const validation = validateData(parsedData, schemaDef);
    if (!validation.valid) {
      showError(`Schema validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    // Clear error
    clearError();

    // Create new chart if it doesn't exist
    if (!orgChart) {
      orgChart = new OrgChart();
    }

    // Apply custom positions to data before rendering
    parsedData.forEach((item: any) => {
      const savedPos = customNodePositions.get(String(item.id));
      if (savedPos) {
        item._customX = savedPos.x;
        item._customY = savedPos.y;
      }
    });

    // Configure and render with options settings
    orgChart
      .container('#chart')
      .data(parsedData)
      .nodeHeight((_d: any) => options.nodeHeight)
      .nodeWidth((_d: any) => options.nodeWidth)
      .childrenMargin((_d: any) => options.childrenMargin)
      .compactMarginBetween((_d: any) => options.compactMarginBetween)
      .compactMarginPair((_d: any) => options.compactMarginPair)
      .neighbourMargin((_a: any, _b: any) => options.neighbourMargin)
      .onNodeClick((d: any) => {
        showNodeDetails(d.data);
      })
      .nodeUpdate(function (this: any, d: any, _i: number, _arr: any[]) {
        // Make nodes draggable
        const node = this;
        
        // Check if d3 is available
        if (!d3 || !d3.drag) {
          console.warn('D3 drag not available');
          return;
        }
        
        // Apply custom position if exists
        if (d.data._customX !== undefined && d.data._customY !== undefined) {
          d3.select(node)
            .attr('transform', `translate(${d.data._customX},${d.data._customY})`);
        }
        
        // Add drag behavior
        const drag = d3.drag()
          .on('start', function (_event: any) {
            d3.select(node).raise();
            d3.select(node).classed('dragging', true);
          })
          .on('drag', function (event: any) {
            // Update visual position
            const x = event.x;
            const y = event.y;
            d3.select(node)
              .attr('transform', `translate(${x},${y})`);
            
            // Store the custom position
            d.data._customX = x;
            d.data._customY = y;
          })
          .on('end', function (_event: any) {
            d3.select(node).classed('dragging', false);
            
            // Save position to localStorage
            customNodePositions.set(String(d.data.id), {
              x: d.data._customX,
              y: d.data._customY
            });
            saveNodePositions(customNodePositions);
          });
        
        d3.select(node).call(drag);
        
        // Add cursor style
        d3.select(node)
          .style('cursor', 'move');
      })
      .nodeContent((d: any) => {
        const picture = d.data.picture || 'https://i.pravatar.cc/150?img=60';
        return `
          <div style="width:${d.width}px;height:${d.height}px;padding:12px;background:#fff;border:2px solid #4A90E2;border-radius:8px;box-sizing:border-box;cursor:move;display:flex;align-items:center;gap:12px">
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:bold;color:#333;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.name || ''}</div>
              <div style="font-size:12px;color:#666;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.title || ''}</div>
              <div style="font-size:11px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.data.department || ''}</div>
            </div>
          </div>
        `;
      })
      .render()
      .fit();

    currentView = 'hierarchy';

  } catch (error) {
    showError(`Error parsing YAML: ${(error as Error).message}`);
  }
}

function showNodeDetails(data: any) {
  const detailsPanel = document.getElementById('node-details');
  if (!detailsPanel) return;

  // Build HTML for all fields in the data
  const picture = data.picture || 'https://i.pravatar.cc/150?img=60';
  let html = '<div class="node-details-content">';
  
  // Add profile picture at the top
  html += `
    <div style="text-align:center;margin-bottom:1rem">
      <img src="${picture}" alt="${data.name}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #667eea;box-shadow:0 2px 8px rgba(0,0,0,0.1)" />
    </div>
  `;
  
  html += `<h3>${data.name || 'Unknown'}</h3>`;
  html += '<div class="details-grid">';
  
  // Show all fields except internal ones (fields starting with underscore) and picture (already shown)
  for (const [key, value] of Object.entries(data)) {
    // Skip internal fields (those starting with underscore) and picture
    if (key.startsWith('_') || key === 'picture') {
      continue;
    }
    
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    html += `
      <div class="detail-row">
        <span class="detail-label">${label}:</span>
        <span class="detail-value">${value || 'N/A'}</span>
      </div>
    `;
  }
  
  html += '</div>';
  
  // Add reorder buttons if node has siblings
  html += '<div class="reorder-buttons" style="display:flex;gap:0.5rem;margin-top:1rem;margin-bottom:1rem">';
  html += '<button id="move-up" class="btn-reorder" style="flex:1;padding:0.5rem;background:#667eea;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem">↑ Move Up</button>';
  html += '<button id="move-down" class="btn-reorder" style="flex:1;padding:0.5rem;background:#667eea;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem">↓ Move Down</button>';
  html += '</div>';
  
  html += '<button id="close-details" class="btn-close">Close</button>';
  html += '</div>';
  
  detailsPanel.innerHTML = html;
  detailsPanel.style.display = 'block';
  
  // Add close button handler
  const closeBtn = document.getElementById('close-details');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      detailsPanel.style.display = 'none';
    });
  }
  
  // Add move up button handler
  const moveUpBtn = document.getElementById('move-up');
  if (moveUpBtn) {
    moveUpBtn.addEventListener('click', () => {
      moveNodeInYAML(data.id, 'up');
    });
  }
  
  // Add move down button handler
  const moveDownBtn = document.getElementById('move-down');
  if (moveDownBtn) {
    moveDownBtn.addEventListener('click', () => {
      moveNodeInYAML(data.id, 'down');
    });
  }
}

function moveNodeInYAML(nodeId: string | number, direction: 'up' | 'down') {
  try {
    const yamlContent = editor.state.doc.toString();
    const { options: userOptions, schema: schemaDef, data: yamlData } = parseFrontMatter(yamlContent);
    const parsedData = jsyaml.load(yamlData);
    
    if (!Array.isArray(parsedData)) {
      showError('Cannot reorder: YAML must be an array');
      return;
    }
    
    // Find the node and its index
    const nodeIndex = parsedData.findIndex(item => String(item.id) === String(nodeId));
    if (nodeIndex === -1) {
      showError('Node not found');
      return;
    }
    
    const currentNode = parsedData[nodeIndex];
    const currentParentId = currentNode.parentId;
    
    // Find siblings (nodes with same parent)
    const siblings = parsedData
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        // Both have no parent (root nodes)
        if (currentParentId === undefined && item.parentId === undefined) return true;
        // Both have same parent
        return String(item.parentId) === String(currentParentId);
      });
    
    // Find current node position among siblings
    const siblingIndex = siblings.findIndex(({ idx }) => idx === nodeIndex);
    
    if (siblingIndex === -1) {
      showError('Error finding node position');
      return;
    }
    
    // Calculate target sibling index
    let targetSiblingIndex = siblingIndex;
    if (direction === 'up' && siblingIndex > 0) {
      targetSiblingIndex = siblingIndex - 1;
    } else if (direction === 'down' && siblingIndex < siblings.length - 1) {
      targetSiblingIndex = siblingIndex + 1;
    } else {
      showError(`Cannot move ${direction}: already at ${direction === 'up' ? 'top' : 'bottom'} of group`);
      return;
    }
    
    // Get the actual array indices to swap
    const currentIdx = siblings[siblingIndex].idx;
    const targetIdx = siblings[targetSiblingIndex].idx;
    
    // Swap the nodes in the array
    [parsedData[currentIdx], parsedData[targetIdx]] = [parsedData[targetIdx], parsedData[currentIdx]];
    
    // Rebuild the YAML
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
    
    // Update the editor
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: newContent
      }
    });
    
    console.log(`Node ${nodeId} moved ${direction}`);
    
  } catch (error) {
    showError(`Error reordering node: ${(error as Error).message}`);
  }
}

function showError(message: string) {
  const errorContainer = document.getElementById('error');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

function clearError() {
  const errorContainer = document.getElementById('error');
  if (errorContainer) {
    errorContainer.style.display = 'none';
  }
}

function renderForceGraph(data: any[]) {
  try {
    // Clear the chart container
    const container = document.getElementById('chart');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Stop any existing force simulation
    if (forceSimulation) {
      forceSimulation.stop();
    }
    
    // Get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Create nodes first with proper id mapping
    const nodes = data.map(d => ({
      id: String(d.id),
      ...d
    }));
    
    // Create a Set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map(n => n.id));
    
    // Create links from parent-child relationships, filtering out invalid links
    const links = data
      .filter(d => d.parentId)
      .filter(d => validNodeIds.has(String(d.parentId)) && validNodeIds.has(String(d.id)))
      .map(d => ({
        source: String(d.parentId),
        target: String(d.id)
      }));
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', 'linear-gradient(to bottom, #fafbfc 0%, #f5f7fa 100%)');
    
    // Add zoom behavior to SVG
    const g = svg.append('g');
    
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom as any);
    
    // Create force simulation
    forceSimulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
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
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);
    
    // Add circles to nodes
    node.append('circle')
      .attr('r', 40)
      .attr('fill', '#4A90E2')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);
    
    // Add text labels
    node.append('text')
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 60)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none');
    
    // Add title text
    node.append('title')
      .text((d: any) => `${d.name}\n${d.title || ''}\n${d.email || ''}`);
    
    // Add click handler
    node.on('click', (_event, d: any) => {
      showNodeDetails(d);
    });
    
    // Update positions on each tick
    forceSimulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) forceSimulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) forceSimulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    currentView = 'force';
    
  } catch (error) {
    showError(`Error rendering force graph: ${(error as Error).message}`);
  }
}



// Add export button functionality
const exportBtn = document.getElementById('export-svg') as HTMLButtonElement;
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    if (orgChart) {
      orgChart.exportSvg();
    }
  });
}

// Add reset positions button functionality
const resetBtn = document.getElementById('reset-positions') as HTMLButtonElement;
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    // Clear localStorage
    localStorage.removeItem(POSITION_STORAGE_KEY);
    customNodePositions.clear();
    
    // Re-render chart to apply default positions
    renderChart();
    
    console.log('Node positions reset to default');
  });
}

// Add toggle view button functionality
const toggleViewBtn = document.getElementById('toggle-view') as HTMLButtonElement;
if (toggleViewBtn) {
  toggleViewBtn.addEventListener('click', () => {
    try {
      const yamlContent = editor.state.doc.toString();
      const { data: yamlData } = parseFrontMatter(yamlContent);
      const parsedData = jsyaml.load(yamlData);
      
      if (!Array.isArray(parsedData)) {
        showError('YAML must be an array');
        return;
      }
      
      if (currentView === 'hierarchy') {
        // Switch to force-directed graph
        renderForceGraph(parsedData);
        toggleViewBtn.textContent = 'Hierarchy View';
      } else {
        // Switch back to hierarchy
        renderChart();
        toggleViewBtn.textContent = 'Force Graph';
      }
    } catch (error) {
      showError(`Error switching view: ${(error as Error).message}`);
    }
  });
}

// Handle window resize
window.addEventListener('resize', () => {
  if (orgChart) {
    orgChart.fit();
  }
});

// Initial render
renderChart();
