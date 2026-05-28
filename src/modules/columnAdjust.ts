/**
 * Column adjustment UI for dynamically changing child node column layouts.
 */

export interface ColumnAdjustContext {
  instanceId: string;
  getChartContainer: () => HTMLElement | null;
  getOrgChart: () => any;
}

export class ColumnAdjustManager {
  private columnAdjustMode = false;
  private columnAdjustButtons: HTMLElement | null = null;
  private ctx: ColumnAdjustContext;

  constructor(ctx: ColumnAdjustContext) {
    this.ctx = ctx;
  }

  get isActive(): boolean {
    return this.columnAdjustMode;
  }

  private getScopedRoot(): ParentNode {
    return this.ctx.getChartContainer()?.closest('.ychart-container') ?? document;
  }

  toggle(): void {
    const orgChart = this.ctx.getOrgChart();
    if (!orgChart) return;

    this.columnAdjustMode = !this.columnAdjustMode;

    const columnAdjustBtn = this.getScopedRoot().querySelector(
      `[data-id="ychart-btn-columnAdjust-${this.ctx.instanceId}"]`
    ) as HTMLElement;
    if (columnAdjustBtn) {
      if (this.columnAdjustMode) {
        columnAdjustBtn.style.background = 'var(--yc-color-accent-purple)';
        columnAdjustBtn.style.color = 'white';
        console.log('Column adjust mode enabled. Click a parent node to adjust its children column layout.');
      } else {
        columnAdjustBtn.style.background = 'transparent';
        columnAdjustBtn.style.color = 'var(--yc-color-icon)';
        this.hideButtons();
        console.log('Column adjust mode disabled.');
      }
    }
  }

  handleNodeClick(nodeData: any): void {
    const chartContainer = this.ctx.getChartContainer();
    if (!this.columnAdjustMode || !chartContainer) return;

    const childrenCount = (nodeData.children?.length || 0) + (nodeData._children?.length || 0);
    if (childrenCount === 0) {
      console.log('This node has no children to arrange.');
      return;
    }

    const currentColumns = nodeData.data._childColumns || 2;
    console.log(`Selected node with ${childrenCount} children. Current columns: ${currentColumns}`);
    this.showButtons(nodeData, currentColumns, childrenCount);
  }

  hideButtons(): void {
    if (this.columnAdjustButtons && this.columnAdjustButtons.parentNode) {
      this.columnAdjustButtons.parentNode.removeChild(this.columnAdjustButtons);
      this.columnAdjustButtons = null;
    }
  }

  private showButtons(nodeData: any, currentColumns: number, childrenCount: number): void {
    this.hideButtons();
    const chartContainer = this.ctx.getChartContainer();
    if (!chartContainer) return;

    this.columnAdjustButtons = document.createElement('div');
    this.columnAdjustButtons.setAttribute('data-id', `ychart-column-adjust-controls-${this.ctx.instanceId}`);
    this.columnAdjustButtons.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--yc-color-overlay-bg);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px var(--yc-color-shadow-dark);
      z-index: 100;
      border: 2px solid var(--yc-color-accent-purple);
      min-width: 300px;
    `;

    const title = document.createElement('div');
    title.textContent = `Adjust Children Columns`;
    title.style.cssText = `
      font-size: var(--yc-font-size-xl);
      font-weight: var(--yc-font-weight-semibold);
      margin-bottom: 15px;
      color: var(--yc-color-ui-slate);
      text-align: center;
    `;
    this.columnAdjustButtons.appendChild(title);

    const info = document.createElement('div');
    info.textContent = `Node: ${nodeData.data.name || nodeData.data.id} (${childrenCount} children)`;
    info.style.cssText = `
      font-size: var(--yc-font-size-base);
      color: var(--yc-color-ui-slate-light);
      margin-bottom: 15px;
      text-align: center;
    `;
    this.columnAdjustButtons.appendChild(info);

    const controlsWrapper = document.createElement('div');
    controlsWrapper.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-bottom: 15px;
    `;

    const decreaseBtn = document.createElement('button');
    decreaseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    decreaseBtn.disabled = currentColumns <= 2;
    decreaseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      background: ${currentColumns <= 2 ? 'var(--yc-color-ui-gray-light)' : 'var(--yc-color-accent-purple)'};
      color: white;
      border-radius: var(--yc-border-radius-lg);
      cursor: ${currentColumns <= 2 ? 'not-allowed' : 'pointer'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    if (currentColumns > 2) {
      decreaseBtn.onmouseover = () => decreaseBtn.style.background = 'var(--yc-color-accent-purple-dark)';
      decreaseBtn.onmouseleave = () => decreaseBtn.style.background = 'var(--yc-color-accent-purple)';
      decreaseBtn.onclick = () => this.adjustColumns(nodeData, currentColumns - 1);
    }

    const columnDisplay = document.createElement('div');
    columnDisplay.textContent = `${currentColumns} Columns`;
    columnDisplay.style.cssText = `
      font-size: var(--yc-font-size-2xl);
      font-weight: var(--yc-font-weight-semibold);
      color: var(--yc-color-ui-slate);
      min-width: 100px;
      text-align: center;
    `;

    const increaseBtn = document.createElement('button');
    increaseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    increaseBtn.disabled = currentColumns >= childrenCount;
    increaseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      background: ${currentColumns >= childrenCount ? 'var(--yc-color-ui-gray-light)' : 'var(--yc-color-accent-purple)'};
      color: white;
      border-radius: var(--yc-border-radius-lg);
      cursor: ${currentColumns >= childrenCount ? 'not-allowed' : 'pointer'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    if (currentColumns < childrenCount) {
      increaseBtn.onmouseover = () => increaseBtn.style.background = 'var(--yc-color-accent-purple-dark)';
      increaseBtn.onmouseleave = () => increaseBtn.style.background = 'var(--yc-color-accent-purple)';
      increaseBtn.onclick = () => this.adjustColumns(nodeData, currentColumns + 1);
    }

    controlsWrapper.appendChild(decreaseBtn);
    controlsWrapper.appendChild(columnDisplay);
    controlsWrapper.appendChild(increaseBtn);
    this.columnAdjustButtons.appendChild(controlsWrapper);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      border: none;
      background: var(--yc-color-ui-slate-lighter);
      color: white;
      border-radius: var(--yc-border-radius-lg);
      cursor: pointer;
      font-size: var(--yc-font-size-md);
      font-weight: var(--yc-font-weight-medium);
      transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = 'var(--yc-color-ui-slate-light)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'var(--yc-color-ui-slate-lighter)';
    closeBtn.onclick = () => this.hideButtons();
    this.columnAdjustButtons.appendChild(closeBtn);

    chartContainer.appendChild(this.columnAdjustButtons);
  }

  private adjustColumns(nodeData: any, newColumns: number): void {
    nodeData.data._childColumns = newColumns;
    console.log(`Adjusted columns to ${newColumns} for node:`, nodeData.data.id);

    const orgChart = this.ctx.getOrgChart();
    if (orgChart) {
      orgChart.render();
      setTimeout(() => {
        orgChart?.fit();
      }, 200);
    }

    this.hideButtons();
  }
}
