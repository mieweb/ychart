/**
 * Node content rendering and details panel for the org chart.
 */
import { escapeHtml } from './utils';
import { renderCardElement } from './templates';
import type { SchemaDefinition, CardElement, YChartOptions } from './types';

export interface NodeRenderContext {
  currentSchema: SchemaDefinition;
  cardTemplate: CardElement[] | null;
  customTemplate: ((d: any, schema: SchemaDefinition) => string) | null;
  currentOptions: YChartOptions;
  defaultOptions: YChartOptions;
}

export interface POIButtonData {
  expandSiblingsBtn: string;
  expandSupervisorChainBtn: string;
}

/**
 * Build the expand-siblings button HTML for a node.
 */
export function buildExpandSiblingsBtn(
  nodeId: any,
  showExpandSiblings: boolean,
  siblingsExpanded: boolean,
  siblingCount: number,
): string {
  if (!showExpandSiblings) return '';

  const userIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#716E7B"/></svg>`;
  const tooltipText = siblingsExpanded ? 'Hide Siblings' : `Show ${siblingCount} Siblings`;

  return `
    <div class="expand-siblings-btn" data-node-id="${nodeId}" style="position:absolute;bottom:-10px;left:10%;transform:translateX(-50%);border:1px solid #E4E2E9;border-radius:3px;padding:2px 5px;font-size:9px;background-color:white;display:flex;align-items:center;gap:2px;cursor:pointer;z-index:100;box-shadow:0 1px 3px rgba(0,0,0,0.1);" aria-label="${tooltipText}" role="button" tabindex="0">
      <span class="node-tooltip">${tooltipText}</span>
      <span style="display:flex;align-items:center;">${userIcon}</span>
      <span style="color:#716E7B;">${siblingsExpanded ? '−' : '+'}${siblingCount}</span>
    </div>
  `;
}

/**
 * Build the expand-supervisor-chain button HTML for a node.
 */
export function buildExpandSupervisorChainBtn(
  show: boolean,
  supervisorChainExpanded: boolean,
  hiddenSupervisorCount: number,
): string {
  if (!show) return '';

  const upArrowIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4l-8 8h5v8h6v-8h5l-8-8z" fill="#716E7B"/></svg>`;
  const tooltip = supervisorChainExpanded
    ? 'Collapse Supervisor Chain'
    : `Expand Supervisor Chain (${hiddenSupervisorCount} above)`;
  const label = supervisorChainExpanded ? '−' : `+${hiddenSupervisorCount}`;

  return `
    <div class="expand-supervisor-chain-btn" style="position:absolute;top:-28px;left:50%;transform:translateX(-50%);border:1px solid #E4E2E9;border-radius:4px;padding:3px 8px;font-size:10px;background-color:white;display:flex;align-items:center;gap:3px;cursor:pointer;z-index:100;box-shadow:0 2px 4px rgba(0,0,0,0.12);" aria-label="${tooltip}" role="button" tabindex="0">
      <span class="node-tooltip">${tooltip}</span>
      <span style="display:flex;align-items:center;">${upArrowIcon}</span>
      <span style="color:#716E7B;font-weight:500;">${label}</span>
    </div>
  `;
}

/**
 * Render the full node content HTML, choosing between custom template, card template, or default.
 */
export function renderNodeContent(
  d: any,
  ctx: NodeRenderContext,
  poiButtons: POIButtonData,
): string {
  const { expandSiblingsBtn, expandSupervisorChainBtn } = poiButtons;

  // Priority 1: Custom template function
  if (ctx.customTemplate) {
    return ctx.customTemplate(d, ctx.currentSchema);
  }

  // Priority 2: Card template from YAML front matter
  if (ctx.cardTemplate && Array.isArray(ctx.cardTemplate)) {
    const cardHtml = ctx.cardTemplate.map((element) => renderCardElement(element, d.data)).join('');
    const nodeHeight = ctx.currentOptions.nodeHeight || ctx.defaultOptions.nodeHeight || 110;

    return `
      <div style="width:${d.width}px !important;height:${nodeHeight}px !important;padding:var(--yc-spacing-xl);background:var(--yc-color-text-inverse);border:var(--yc-border-width-medium) solid var(--yc-color-primary);border-radius:var(--yc-border-radius-lg);box-sizing:border-box;position:relative">
        <div class="details-btn" style="position:absolute;top:var(--yc-spacing-xs);right:var(--yc-spacing-xs);width:var(--yc-height-icon-sm);height:var(--yc-height-icon-sm);background:var(--yc-color-gray-300);border-radius:var(--yc-border-radius-full);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:var(--yc-font-size-sm);color:var(--yc-color-text-secondary);z-index:var(--yc-z-index-overlay);border:var(--yc-border-width-thin) solid var(--yc-color-gray-500);" title="Show Details" aria-label="Show Details" role="button" tabindex="0">ℹ</div>
        ${expandSupervisorChainBtn}
        ${expandSiblingsBtn}
        ${cardHtml}
      </div>
    `;
  }

  // Priority 3: Default template
  const defaultNodeHeight = ctx.currentOptions.nodeHeight || ctx.defaultOptions.nodeHeight || 110;

  return `
    <div style="width:${d.width}px !important;height:${defaultNodeHeight}px !important;padding:var(--yc-spacing-xl);background:var(--yc-color-text-inverse);border:var(--yc-border-width-medium) solid var(--yc-color-primary);border-radius:var(--yc-border-radius-lg);box-sizing:border-box;display:flex;align-items:center;gap:var(--yc-spacing-xl);position:relative">
      <div class="details-btn" style="position:absolute;top:var(--yc-spacing-xs);right:var(--yc-spacing-xs);width:var(--yc-height-icon-sm);height:var(--yc-height-icon-sm);background:var(--yc-color-gray-300);border-radius:var(--yc-border-radius-full);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:var(--yc-font-size-sm);color:var(--yc-color-text-secondary);z-index:var(--yc-z-index-overlay);border:var(--yc-border-width-thin) solid var(--yc-color-gray-500);" title="Show Details" aria-label="Show Details" role="button" tabindex="0">ℹ</div>
      ${expandSupervisorChainBtn}
      ${expandSiblingsBtn}
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--yc-font-size-md);font-weight:var(--yc-font-weight-bold);color:var(--yc-color-text-primary);margin-bottom:var(--yc-spacing-xs);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(d.data.name)}</div>
        <div style="font-size:var(--yc-font-size-sm);color:var(--yc-color-text-secondary);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(d.data.title)}</div>
        <div style="font-size:var(--yc-font-size-xs);color:var(--yc-color-gray-600);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(d.data.department)}</div>
      </div>
    </div>
  `;
}

/**
 * Render the node details panel HTML.
 */
export function renderNodeDetails(data: any, instanceId: string): string {
  let html = '<div class="node-details-content" style="font-family:var(--yc-font-family-base);">';
  html += `<h3 style="margin:0 0 var(--yc-spacing-3xl) 0;color:var(--yc-color-text-primary);">${escapeHtml(data.name) || 'Unknown'}</h3>`;
  html += '<div style="display:grid;gap:var(--yc-spacing-md);">';

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('_') || key === 'picture') continue;

    const label = escapeHtml(key.charAt(0).toUpperCase() + key.slice(1));
    html += `
      <div style="display:grid;grid-template-columns:120px 1fr;gap:var(--yc-spacing-md);">
        <span style="font-weight:var(--yc-font-weight-semibold);color:var(--yc-color-text-secondary);">${label}:</span>
        <span style="color:var(--yc-color-text-primary);">${escapeHtml(value as string) || 'N/A'}</span>
      </div>
    `;
  }

  html += '</div>';
  html += `<button type="button" data-id="ychart-node-details-close-${instanceId}" style="margin-top:var(--yc-spacing-3xl);padding:var(--yc-spacing-md) var(--yc-spacing-3xl);background:var(--yc-color-primary);color:white;border:none;border-radius:var(--yc-border-radius-sm);cursor:pointer;width:100%;">Close</button>`;
  html += '</div>';

  return html;
}
