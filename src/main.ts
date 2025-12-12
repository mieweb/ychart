import './styles/styles.scss';
import YChartEditor from './ychartEditor';
import orgChartDataRaw from './orgchart.yaml?raw';
import { commitHash, commitHashFull, repoUrl } from 'virtual:git-info';

// Update git info in header
function updateGitInfo() {
  const commitHashEl = document.getElementById('commit-hash');
  const commitLinkEl = document.getElementById('commit-link') as HTMLAnchorElement;
  const repoLinkEl = document.getElementById('repo-link') as HTMLAnchorElement;

  if (commitHashEl) {
    commitHashEl.textContent = commitHash || 'dev';
  }
  if (commitLinkEl && commitHashFull && repoUrl) {
    commitLinkEl.href = `${repoUrl}/commit/${commitHashFull}`;
    commitLinkEl.title = `View commit ${commitHash} on GitHub`;
  }
  if (repoLinkEl && repoUrl) {
    repoLinkEl.href = repoUrl;
  }
}

updateGitInfo();

// HMR support - update git info when the virtual module changes
if (import.meta.hot) {
  import.meta.hot.accept('virtual:git-info', (newModule) => {
    if (newModule) {
      const commitHashEl = document.getElementById('commit-hash');
      const commitLinkEl = document.getElementById('commit-link') as HTMLAnchorElement;
      
      if (commitHashEl) {
        commitHashEl.textContent = newModule.commitHash || 'dev';
      }
      if (commitLinkEl && newModule.commitHashFull && newModule.repoUrl) {
        commitLinkEl.href = `${newModule.repoUrl}/commit/${newModule.commitHashFull}`;
        commitLinkEl.title = `View commit ${newModule.commitHash} on GitHub`;
      }
    }
  });
}

// Sample YAML data with front matter for options and schema configuration
const defaultYAML = orgChartDataRaw;

// Alternative example with nested structure (for reference):
/*
const alternativeYAML = `---
schema:
  id: number | required
  name: string | required
  title: string | optional
  department: string | optional
card:
  - div:
      class: card-wrapper
      style: padding:var(--yc-spacing-md);
      children:
        - h1:
            class: card-title
            content: $name$
        - div:
            style: font-weight:var(--yc-font-weight-bold);
            content: $title$
        - div:
            class: info-section
            children:
              - span: "Email: "
              - span:
                  style: color:var(--yc-color-primary);
                  content: $email$
---

${orgChartDataRaw}`;
*/

// Initialize the YChart Editor with builder pattern
const ychartEditor = new YChartEditor({
  nodeWidth: 220,
  nodeHeight: 110,
  editorTheme: 'dark',
  collapsible: true,
  // Optional: Configure toolbar position and orientation at initialization
  // toolbarPosition: 'topright',
  // toolbarOrientation: 'vertical'
});

// Simple initialization - toolbar buttons are now built-in!
ychartEditor
  .initView('container', defaultYAML)
  .bgPatternStyle('dotted') // Optional: 'dotted' or 'dashed'
  .actionBtnPos('bottomleft', 'horizontal'); // Optional: customize toolbar position and layout

// Note: The card template is now defined in the YAML front matter (see defaultYAML above)
// You can also use the .template() method for programmatic control (takes priority over YAML card definition)

// Example with .template() method (overrides YAML card definition):
// ychartEditor
//   .initView('container', defaultYAML)
//   .template((d, schema) => {
//     return `
//       <div style="width:${d.width}px;height:${d.height}px;padding:12px;">
//         <div class="title-header">${d.data.name}</div>
//         ${schema.title ? `<div>${d.data.title}</div>` : ''}
//       </div>
//     `;
//   });

// Alternative YAML with different card structure (commented out):
// const alternativeYAML = `---
// schema:
//   id: number | required
//   name: string | required
//   title: string | optional
// card:
//   - div:
//       class: card-wrapper
//       children:
//         - h1: $name$
//         - div:
//             style: font-weight:bold;
//             content: $title$
// ---
// ${orgChartDataRaw}`;

// Examples of other toolbar positions:
// .actionBtnPos('topright', 'vertical')    // Top-right corner, vertical layout
// .actionBtnPos('topcenter', 'horizontal') // Top-center, horizontal layout
// .actionBtnPos('bottomright', 'horizontal') // Bottom-right corner
// .actionBtnPos('topleft', 'vertical')     // Top-left corner, vertical layout
// .actionBtnPos('bottomcenter', 'horizontal') // Bottom-center, horizontal layout

// Note: The following button attachments are deprecated and no longer needed
// The toolbar is now integrated into the canvas with better UI/UX
// .enableSwapBtn('toggle-swap')
// .resetBtn('reset-positions')
// .exportSVGBtn('export-svg')
// .toggleViewBtn('toggle-view')

console.log('YChart Editor initialized!');

// Expose editor to window for debugging
(window as any).ychartEditor = ychartEditor;
// Test deployment
