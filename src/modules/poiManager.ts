/**
 * Person of Interest (POI) Manager — manages POI state, selection, 
 * UI selector DOM creation, and event delegation for expand siblings/supervisor chain.
 */

import { renderSelect } from './reactBridge';
import {
  buildVirtualData as buildVirtualDataFn,
  shouldShowExpandSiblings as shouldShowExpandSiblingsFn,
  getSiblingCount as getSiblingCountFn,
  getSupervisorChainInfo as getSupervisorChainInfoFn,
  isTopmostVisibleSupervisor as isTopmostVisibleSupervisorFn,
  getHiddenSupervisorCount as getHiddenSupervisorCountFn,
} from './poi';
import type { POIState } from './poi';

export interface POIManagerContext {
  instanceId: string;
  getOrgChart: () => any;
  getTruthData: () => any[];
  getSupervisorFields: () => string[];
  getNameField: () => string;
  getChartContainer: () => HTMLElement | null;
  renderChart: () => void;
}

export class POIManager {
  private ctx: POIManagerContext;

  // POI state
  personOfInterest: any = null;
  expandedSiblings: Set<string> = new Set();
  supervisorChainExpanded: boolean = false;
  initialSelf: string | number | null = null;
  selfApplied: boolean = false;
  private centerPersonOfInterest: boolean = true;

  // DOM references
  private poiSelector: HTMLElement | null = null;
  private poiClearBtn: HTMLButtonElement | null = null;

  constructor(ctx: POIManagerContext) {
    this.ctx = ctx;
  }

  /** Create the POI selector DOM element */
  createPOISelector(): HTMLElement {
    const container = document.createElement('div');
    container.setAttribute('data-id', `ychart-poi-selector-${this.ctx.instanceId}`);
    container.className = 'ychart-poi-selector';
    container.style.cssText = `
      position: absolute;
      top: var(--yc-spacing-4xl);
      left: var(--yc-spacing-4xl);
      z-index: var(--yc-z-index-search-popup);
      display: flex;
      flex-direction: column;
      gap: var(--yc-spacing-xs);
    `;

    const selectorWrapper = document.createElement('div');
    selectorWrapper.className = 'ychart-poi-selector-wrapper';
    selectorWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: var(--yc-spacing-xs);
      background: var(--yc-color-bg-card);
      border-radius: var(--yc-border-radius-pill);
      padding: var(--yc-spacing-xs) var(--yc-spacing-sm);
      box-shadow: var(--yc-shadow-2xl);
      border: none;
      transition: all var(--yc-transition-fast);
    `;

    // Target/focus icon
    const focusIcon = document.createElement('span');
    focusIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    `;
    focusIcon.style.cssText = `
      color: var(--yc-color-text-muted);
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;

    // React Select container for POI dropdown
    const selectContainer = document.createElement('div');
    selectContainer.setAttribute('data-id', `ychart-poi-select-${this.ctx.instanceId}`);
    selectContainer.style.cssText = `
      min-width: 140px;
      max-width: 180px;
    `;

    // Clear to root button
    const clearBtn = document.createElement('button');
    clearBtn.setAttribute('data-id', `ychart-poi-clear-${this.ctx.instanceId}`);
    clearBtn.setAttribute('aria-label', 'Reset focus to root');
    clearBtn.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      background: var(--yc-color-button-bg);
      border-radius: var(--yc-border-radius-full);
      cursor: pointer;
      color: var(--yc-color-text-muted);
      flex-shrink: 0;
      transition: all var(--yc-transition-fast);
    `;

    const clearIcon = document.createElement('span');
    clearIcon.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    `;
    clearIcon.style.cssText = 'display: flex; align-items: center; justify-content: center;';
    clearBtn.appendChild(clearIcon);

    const clearTooltip = document.createElement('span');
    clearTooltip.className = 'ychart-tooltip';
    clearTooltip.textContent = 'Reset to root';
    clearTooltip.style.cssText = `
      position: absolute;
      top: calc(100% + var(--yc-spacing-md));
      left: 50%;
      transform: translateX(-50%) scale(0.8);
      background: var(--yc-color-overlay-dark);
      color: white;
      padding: var(--yc-spacing-sm) var(--yc-spacing-xl);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-sm);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: all var(--yc-transition-fast) var(--yc-transition-bounce);
      z-index: var(--yc-z-index-search-popup);
      box-shadow: var(--yc-shadow-md);
    `;
    clearBtn.appendChild(clearTooltip);

    clearBtn.addEventListener('mouseenter', () => {
      clearBtn.style.background = 'var(--yc-color-primary)';
      clearBtn.style.color = 'white';
      clearTooltip.style.opacity = '1';
      clearTooltip.style.transform = 'translateX(-50%) scale(1)';
    });

    clearBtn.addEventListener('mouseleave', () => {
      clearBtn.style.background = 'var(--yc-color-button-bg)';
      clearBtn.style.color = 'var(--yc-color-text-muted)';
      clearTooltip.style.opacity = '0';
      clearTooltip.style.transform = 'translateX(-50%) scale(0.8)';
    });

    clearBtn.addEventListener('click', () => {
      this.resetToRoot();
    });

    this.poiClearBtn = clearBtn;

    selectorWrapper.appendChild(focusIcon);
    selectorWrapper.appendChild(selectContainer);
    selectorWrapper.appendChild(clearBtn);
    container.appendChild(selectorWrapper);

    this.poiSelector = container;
    return container;
  }

  /** Set up event delegation for expand siblings / supervisor chain buttons */
  setupExpandSiblingsHandlers(): void {
    const chartContainer = this.ctx.getChartContainer();
    if (!chartContainer) return;

    chartContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      const expandSiblingsBtn = target.closest('.expand-siblings-btn');
      if (expandSiblingsBtn) {
        e.stopPropagation();
        const nodeId = expandSiblingsBtn.getAttribute('data-node-id');
        if (nodeId) {
          this.toggleSiblingsExpansion(nodeId);
        }
        return;
      }

      const expandSupervisorBtn = target.closest('.expand-supervisor-chain-btn');
      if (expandSupervisorBtn) {
        e.stopPropagation();
        this.toggleSupervisorChainExpansion();
        return;
      }
    });
  }

  // ── POI state management ──

  resetToRoot(): void {
    this.personOfInterest = null;
    this.expandedSiblings.clear();
    this.supervisorChainExpanded = false;
    this.centerPersonOfInterest = false;

    this.updatePOISelector(this.ctx.getTruthData());
    this.ctx.renderChart();

    const orgChart = this.ctx.getOrgChart();
    if (orgChart) {
      setTimeout(() => orgChart.fit(), 100);
    }
  }

  setPersonOfInterest(personId: string): void {
    if (!personId) {
      this.personOfInterest = null;
      this.expandedSiblings.clear();
      this.supervisorChainExpanded = false;
      this.centerPersonOfInterest = false;
      this.ctx.renderChart();
      this.updateResetButtonAnimation();
      return;
    }

    const person = this.ctx.getTruthData().find((item: any) => String(item.id) === personId);
    if (!person) return;

    this.personOfInterest = person;
    this.expandedSiblings.clear();
    this.expandedSiblings.add(String(person.id));
    this.supervisorChainExpanded = false;
    this.centerPersonOfInterest = true;
    this.ctx.renderChart();
    this.updateResetButtonAnimation();

    setTimeout(() => {
      this.centerOnPOI();
      this.selectNode(person.id);
    }, 150);
  }

  updatePOISelectorValue(_nodeId: string): void {
    const truthData = this.ctx.getTruthData();
    if (truthData.length > 0) {
      this.updatePOISelector(truthData);
    }
  }

  /** Resolve a 'self' identifier to a person's ID */
  resolveSelfToPersonId(selfValue: string | number): string | null {
    const truthData = this.ctx.getTruthData();
    if (!truthData || truthData.length === 0) return null;

    const searchValue = String(selfValue).toLowerCase();
    const nameField = this.ctx.getNameField();
    const supervisorFields = this.ctx.getSupervisorFields();
    const searchFields = ['id', 'email', nameField, 'name', 'title', ...supervisorFields];

    // Exact match on id (case-sensitive)
    const exactIdMatch = truthData.find((item: any) => String(item.id) === String(selfValue));
    if (exactIdMatch) return String(exactIdMatch.id);

    // Case-insensitive match on other fields
    for (const field of searchFields) {
      if (field === 'id') continue;
      const match = truthData.find((item: any) => {
        const fieldValue = item[field];
        if (fieldValue === undefined || fieldValue === null) return false;
        return String(fieldValue).toLowerCase() === searchValue;
      });
      if (match) return String(match.id);
    }

    console.warn(`[YChart] Could not resolve 'self' value "${selfValue}" to any person in the data`);
    return null;
  }

  /** Apply the initial 'self' POI if set in options (called once after first chart render) */
  applyInitialSelf(): void {
    if (this.selfApplied || this.initialSelf === null) return;
    this.selfApplied = true;

    const personId = this.resolveSelfToPersonId(this.initialSelf);
    if (personId) {
      setTimeout(() => this.setPersonOfInterest(personId), 200);
    }
  }

  /** Apply initial self before the first render so the chart does not visibly reflow into POI mode. */
  applyInitialSelfBeforeRender(): void {
    if (this.selfApplied || this.initialSelf === null) return;
    this.selfApplied = true;

    const personId = this.resolveSelfToPersonId(this.initialSelf);
    if (!personId) return;

    const person = this.ctx.getTruthData().find((item: any) => String(item.id) === personId);
    if (!person) return;

    this.personOfInterest = person;
    this.expandedSiblings.clear();
    this.expandedSiblings.add(String(person.id));
    this.supervisorChainExpanded = false;
    this.centerPersonOfInterest = false;
    this.updateResetButtonAnimation();
  }

  // ── POI data delegation (thin wrappers) ──

  buildVirtualData(data: any[]): any[] {
    return buildVirtualDataFn(data, this.getState());
  }

  shouldShowExpandSiblings(nodeId: any): boolean {
    return shouldShowExpandSiblingsFn(nodeId, this.personOfInterest, this.ctx.getTruthData());
  }

  getSiblingCount(nodeId: any): number {
    return getSiblingCountFn(nodeId, this.ctx.getTruthData());
  }

  getSupervisorChainInfo(): { directSupervisor: any | null; chainLength: number } {
    return getSupervisorChainInfoFn(this.personOfInterest, this.ctx.getTruthData());
  }

  isTopmostVisibleSupervisor(nodeId: any): boolean {
    return isTopmostVisibleSupervisorFn(nodeId, this.personOfInterest, this.ctx.getTruthData());
  }

  getHiddenSupervisorCount(nodeId: any): number {
    return getHiddenSupervisorCountFn(nodeId, this.personOfInterest, this.ctx.getTruthData());
  }

  // ── Internal helpers ──

  private getState(): POIState {
    return {
      personOfInterest: this.personOfInterest,
      truthData: this.ctx.getTruthData(),
      expandedSiblings: this.expandedSiblings,
      supervisorChainExpanded: this.supervisorChainExpanded,
      centerPersonOfInterest: this.centerPersonOfInterest,
    };
  }

  private updateResetButtonAnimation(): void {
    if (!this.poiClearBtn) return;
    if (!this.personOfInterest) {
      this.poiClearBtn.style.animation = 'none';
    } else {
      this.poiClearBtn.style.animation = 'pulseGlow 2s ease-in-out infinite';
    }
  }

  private toggleSupervisorChainExpansion(): void {
    this.supervisorChainExpanded = !this.supervisorChainExpanded;
    this.ctx.renderChart();
  }

  private toggleSiblingsExpansion(nodeId: any): void {
    const nodeIdStr = String(nodeId);
    if (this.expandedSiblings.has(nodeIdStr)) {
      this.expandedSiblings.delete(nodeIdStr);
    } else {
      this.expandedSiblings.add(nodeIdStr);
    }
    this.ctx.renderChart();
  }

  updatePOISelector(data: any[]): void {
    if (!this.poiSelector) return;

    const selectContainer = this.poiSelector.querySelector(
      `[data-id="ychart-poi-select-${this.ctx.instanceId}"]`
    ) as HTMLElement;
    if (!selectContainer) return;

    const truthData = this.ctx.getTruthData();

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const uniqueData = data.filter(item => {
      const idStr = String(item.id);
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });

    const rootNode =
      truthData.find(item => item.parentId === null || item.parentId === undefined) ||
      uniqueData.find(item => item.parentId === null || item.parentId === undefined);

    const sortedData = [...uniqueData].sort((a, b) =>
      (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
    );

    const options = sortedData.map(item => {
      let label = item.name || String(item.id);
      if (rootNode && item.id === rootNode.id) label += ' [Root]';
      return { label, value: String(item.id) };
    });

    const currentValue = this.personOfInterest ? String(this.personOfInterest.id) : '';

    renderSelect(selectContainer, {
      options,
      value: currentValue,
      placeholder: 'Select...',
      ariaLabel: 'Select person of interest',
      size: 'sm',
      searchable: true,
      onValueChange: (value: string) => {
        this.setPersonOfInterest(value);
      },
    });
  }

  private centerOnPOI(): void {
    const orgChart = this.ctx.getOrgChart();
    if (!orgChart || !this.personOfInterest) return;

    try {
      const attrs = orgChart.getChartState();
      const allNodes = attrs.allNodes || [];
      const poiNode = allNodes.find((node: any) => node.data.id === this.personOfInterest.id);
      if (poiNode) {
        orgChart.setCentered(poiNode.data.id);
      }
    } catch (_error) {
      // Silently handle
    }
  }

  private selectNode(nodeId: any): void {
    const orgChart = this.ctx.getOrgChart();
    if (!orgChart) return;

    try {
      const attrs = orgChart.getChartState();
      attrs.selectedNodeId = nodeId;
      if (attrs.root) {
        orgChart.update(attrs.root);
      }
    } catch (_error) {
      // Silently handle
    }
  }
}
