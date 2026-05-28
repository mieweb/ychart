import type { EditorView } from 'codemirror';
import * as jsyaml from 'js-yaml';
import type { FrontMatter } from './types';

export interface SwapHandlerContext {
  instanceId: string;
  getEditor: () => EditorView | null;
  getOrgChart: () => any;
  getRootContainer?: () => HTMLElement | null;
  parseFrontMatter: (content: string) => FrontMatter;
  setIsUpdatingProgrammatically: (value: boolean) => void;
}

export class SwapHandler {
  enabled = false;
  private ctx: SwapHandlerContext;

  constructor(ctx: SwapHandlerContext) {
    this.ctx = ctx;
  }

  private getScopedRoot(): ParentNode {
    return this.ctx.getRootContainer?.() ?? document;
  }

  toggle(): void {
    const orgChart = this.ctx.getOrgChart();
    if (!orgChart) return;

    this.enabled = !this.enabled;

    if (typeof orgChart.enableSwapMode === 'function') {
      orgChart.enableSwapMode(this.enabled);
    }

    if (typeof orgChart.onNodeSwap === 'function') {
      orgChart.onNodeSwap((data1: any, data2: any) => {
        this.performSwap(data1, data2);
      });
    }

    // Update button style
    const swapBtn = this.getScopedRoot().querySelector(`[data-id="ychart-btn-swap-${this.ctx.instanceId}"]`) as HTMLElement;
    if (swapBtn) {
      if (this.enabled) {
        swapBtn.style.background = 'var(--yc-color-accent-red)';
        swapBtn.style.color = 'white';
      } else {
        swapBtn.style.background = 'transparent';
        swapBtn.style.color = 'var(--yc-color-icon)';
      }
    }
  }

  performSwap(data1: any, data2: any): void {
    try {
      const editor = this.ctx.getEditor();
      if (!editor) return;

      this.ctx.setIsUpdatingProgrammatically(true);

      const yamlContent = editor.state.doc.toString();
      const { options: userOptions, schema: schemaDef, card: cardDef, data: yamlData } = this.ctx.parseFrontMatter(yamlContent);
      const parsedData = jsyaml.load(yamlData);

      if (!Array.isArray(parsedData)) {
        console.error('Cannot update YAML: not an array');
        return;
      }

      const idx1 = parsedData.findIndex((item: any) => String(item.id) === String(data1.id));
      const idx2 = parsedData.findIndex((item: any) => String(item.id) === String(data2.id));

      if (idx1 === -1 || idx2 === -1) {
        console.error('Could not find nodes in YAML data');
        return;
      }

      [parsedData[idx1], parsedData[idx2]] = [parsedData[idx2], parsedData[idx1]];

      // Reconstruct front matter using js-yaml for proper serialization
      const frontMatterObj: Record<string, any> = {};
      if (userOptions && Object.keys(userOptions).length > 0) {
        frontMatterObj.options = userOptions;
      }
      if (schemaDef && Object.keys(schemaDef).length > 0) {
        // Convert schema back to the compact string format
        const schemaObj: Record<string, string> = {};
        for (const [key, field] of Object.entries(schemaDef)) {
          const modifiers = [field.type, field.required ? 'required' : 'optional', field.missing ? 'missing' : ''].filter(Boolean);
          schemaObj[key] = modifiers.join(' | ');
        }
        frontMatterObj.schema = schemaObj;
      }
      if (cardDef) {
        frontMatterObj.card = cardDef;
      }

      const frontMatterYaml = jsyaml.dump(frontMatterObj, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });

      const newYamlData = jsyaml.dump(parsedData, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });

      const newContent = `---\n${frontMatterYaml}---\n\n${newYamlData}`;

      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: newContent,
        },
      });

      console.log(`Nodes swapped: ${data1.name} ↔ ${data2.name}`);
    } catch (error) {
      console.error('Error updating YAML after swap:', error);
    } finally {
      this.ctx.setIsUpdatingProgrammatically(false);
    }
  }
}
