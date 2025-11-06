import './style.css';
import YChartEditor from './ychartEditor';
import orgChartDataRaw from './orgchart.yaml?raw';

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

// Initialize the YChart Editor with builder pattern
const ychartEditor = new YChartEditor({
  nodeWidth: 220,
  nodeHeight: 110,
  editorTheme: 'dark',
  collapsible: true
});

ychartEditor
  .initView('container', defaultYAML)
  .enableSwapBtn('toggle-swap')
  .resetBtn('reset-positions')
  .exportSVGBtn('export-svg')
  .toggleViewBtn('toggle-view');

console.log('YChart Editor initialized!');
