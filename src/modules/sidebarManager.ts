/**
 * Sidebar (editor panel) management for YChart.
 * Handles toggling, expand/collapse animation, and scroll-to-node behavior.
 * Extracted from YChartEditor to reduce orchestrator complexity.
 */

import { EditorView } from 'codemirror';
import { applyBackgroundPattern } from './patterns';
import { scrollToNodeInEditor } from './editorSetup';

export interface SidebarManagerContext {
  instanceId: string;
  getEditor: () => EditorView | null;
  getOrgChart: () => any;
  getChartContainer: () => HTMLElement | null;
  getBgPattern: () => 'dotted' | 'dashed' | undefined;
  getPatternColor: () => string | undefined;
}

export class SidebarManager {
  private ctx: SidebarManagerContext;

  constructor(ctx: SidebarManagerContext) {
    this.ctx = ctx;
  }

  private getScopedRoot(): ParentNode {
    return this.ctx.getChartContainer()?.closest('.ychart-container') ?? document;
  }

  toggle(): void {
    const root = this.getScopedRoot();
    const sidebar = root.querySelector(`[data-id="ychart-editor-sidebar-${this.ctx.instanceId}"]`) as HTMLElement | null;
    const collapseBtn = root.querySelector(`[data-id="ychart-collapse-editor-${this.ctx.instanceId}"]`) as HTMLElement | null;

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
        const editor = this.ctx.getEditor();
        if (editor) {
          editor.requestMeasure();
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
      const orgChart = this.ctx.getOrgChart();
      const chartContainer = this.ctx.getChartContainer();
      if (orgChart && chartContainer) {
        // Force SVG to update by calling render then fit
        orgChart.render().fit();

        // Reapply background pattern after re-render
        const bgPattern = this.ctx.getBgPattern();
        if (bgPattern) {
          setTimeout(() => applyBackgroundPattern(chartContainer, bgPattern, this.ctx.getPatternColor()), 50);
        }
      }
    }, 250);
  }

  toggleAndScrollToNode(): void {
    const sidebar = this.getScopedRoot().querySelector(`[data-id="ychart-editor-sidebar-${this.ctx.instanceId}"]`) as HTMLElement | null;
    if (!sidebar) return;

    const isCollapsed = sidebar.style.width === '0px';
    this.toggle();

    if (isCollapsed) {
      setTimeout(() => this.scrollToSelectedNode(), 400);
    }
  }

  scrollToSelectedNode(): void {
    const editor = this.ctx.getEditor();
    const orgChart = this.ctx.getOrgChart();
    if (!editor || !orgChart) return;
    const chartState = orgChart.getChartState();
    scrollToNodeInEditor(editor, chartState?.selectedNodeId);
  }
}
