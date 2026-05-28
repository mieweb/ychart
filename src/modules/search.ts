import { fuzzyMatch, escapeHtml } from './utils';
import type { SchemaDefinition } from './types';
import { renderSelect } from './reactBridge';

/**
 * Configuration context for SearchManager, providing access to external state.
 */
export interface SearchContext {
  instanceId: string;
  getOrgChart: () => any;
  getTruthData: () => any[];
  getCurrentSchema: () => SchemaDefinition;
  getChartContainer: () => HTMLElement | null;
  getPersonOfInterest: () => any;
  setPersonOfInterest: (personId: string) => void;
  updatePOISelectorValue: (nodeId: string) => void;
  resetToRoot: () => void;
}

/**
 * Manages search, filter, and search history UI and logic.
 */
export class SearchManager {
  private searchPopup: HTMLElement | null = null;
  private searchHistoryPopup: HTMLElement | null = null;
  private floatingSearchBar: HTMLElement | null = null;
  private searchResultsDropdown: HTMLElement | null = null;
  private activeFieldFilters: Map<string, Set<string>> = new Map();
  private filterPopup: HTMLElement | null = null;
  private ctx: SearchContext;

  constructor(ctx: SearchContext) {
    this.ctx = ctx;
  }

  createFloatingSearchBar(): HTMLElement {
    const container = document.createElement('div');
    container.setAttribute('data-id', `ychart-floating-search-${this.ctx.instanceId}`);
    container.className = 'ychart-floating-search';
    container.style.cssText = `
      position: absolute;
      top: var(--yc-spacing-4xl);
      left: 50%;
      transform: translateX(-50%);
      z-index: var(--yc-z-index-search-popup);
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    // Ensure relative positioning for absolutely-positioned dropdown
    container.style.position = 'absolute';

    const searchBarWrapper = document.createElement('div');
    searchBarWrapper.className = 'ychart-search-bar-wrapper';
    searchBarWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: var(--yc-spacing-sm);
      background: var(--yc-color-bg-card);
      border-radius: var(--yc-border-radius-pill);
      padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
      box-shadow: var(--yc-shadow-2xl);
      border: var(--yc-border-width-thin) solid var(--yc-color-shadow-light);
      min-width: 320px;
      transition: all var(--yc-transition-fast);
    `;

    // Search icon
    const searchIcon = document.createElement('span');
    searchIcon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    `;
    searchIcon.style.cssText = `
      color: var(--yc-color-text-muted);
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search organization...';
    searchInput.setAttribute('data-id', `ychart-search-input-${this.ctx.instanceId}`);
    searchInput.setAttribute('aria-label', 'Search organization directory');
    searchInput.style.cssText = `
      flex: 1;
      border: none;
      background: transparent;
      font-size: var(--yc-font-size-md);
      color: var(--yc-color-text-primary);
      outline: none;
      min-width: 150px;
    `;

    // Field filter dropdown
    const fieldSelect = document.createElement('select');
    fieldSelect.setAttribute('data-id', `ychart-search-field-${this.ctx.instanceId}`);
    fieldSelect.setAttribute('aria-label', 'Filter search by field');
    fieldSelect.style.cssText = `
      border: none;
      background: var(--yc-color-button-bg);
      border-radius: var(--yc-border-radius-md);
      padding: var(--yc-spacing-xs) var(--yc-spacing-md);
      font-size: var(--yc-font-size-sm);
      color: var(--yc-color-text-secondary);
      cursor: pointer;
      outline: none;
      flex-shrink: 0;
    `;

    // Add "All Fields" as default option
    const allOption = document.createElement('option');
    allOption.value = '__all__';
    allOption.textContent = 'All Fields';
    allOption.selected = true;
    fieldSelect.appendChild(allOption);

    // Keyboard shortcut hint
    const shortcutHint = document.createElement('span');
    shortcutHint.textContent = '⌘K';
    shortcutHint.style.cssText = `
      font-size: var(--yc-font-size-xs);
      color: var(--yc-color-text-light);
      background: var(--yc-color-button-bg);
      padding: var(--yc-spacing-xxs) var(--yc-spacing-sm);
      border-radius: var(--yc-border-radius-sm);
      flex-shrink: 0;
      font-family: var(--yc-font-family-mono);
    `;

    searchBarWrapper.appendChild(searchIcon);
    searchBarWrapper.appendChild(searchInput);
    searchBarWrapper.appendChild(fieldSelect);

    // Populate field options when field select is focused (not just search input)
    fieldSelect.addEventListener('focus', () => {
      this.updateSearchFieldOptions(fieldSelect);
    });

    // Filter (funnel-plus) button
    const filterBtn = document.createElement('button');
    filterBtn.setAttribute('data-id', `ychart-filter-btn-${this.ctx.instanceId}`);
    filterBtn.setAttribute('aria-label', 'Filter nodes');
    filterBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        <line x1="19" y1="9" x2="19" y2="15"/>
        <line x1="16" y1="12" x2="22" y2="12"/>
      </svg>
    `;
    filterBtn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--yc-color-text-muted);
      cursor: pointer;
      padding: var(--yc-spacing-xs);
      border-radius: var(--yc-border-radius-md);
      transition: all 0.2s;
      flex-shrink: 0;
      position: relative;
    `;
    filterBtn.addEventListener('mouseenter', () => {
      filterBtn.style.background = 'var(--yc-color-button-bg)';
      filterBtn.style.color = 'var(--yc-color-primary)';
    });
    filterBtn.addEventListener('mouseleave', () => {
      if (!this.filterPopup || this.filterPopup.style.display === 'none') {
        filterBtn.style.background = 'transparent';
        filterBtn.style.color = this.activeFieldFilters.size > 0 ? 'var(--yc-color-primary)' : 'var(--yc-color-text-muted)';
      }
    });
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFilterPopup();
    });

    searchBarWrapper.appendChild(filterBtn);
    searchBarWrapper.appendChild(shortcutHint);

    // Results dropdown
    const resultsDropdown = document.createElement('div');
    resultsDropdown.setAttribute('data-id', `ychart-search-results-${this.ctx.instanceId}`);
    resultsDropdown.className = 'ychart-search-results';
    resultsDropdown.style.cssText = `
      display: none;
      flex-direction: column;
      background: var(--yc-color-bg-card);
      border-radius: var(--yc-border-radius-lg);
      box-shadow: var(--yc-shadow-2xl);
      border: var(--yc-border-width-thin) solid var(--yc-color-shadow-light);
      margin-top: var(--yc-spacing-sm);
      max-height: 300px;
      overflow-y: auto;
      min-width: 320px;
      width: 100%;
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
    `;
    this.searchResultsDropdown = resultsDropdown;

    container.appendChild(searchBarWrapper);
    container.appendChild(resultsDropdown);

    // Add focus styles
    searchInput.addEventListener('focus', () => {
      searchBarWrapper.style.boxShadow = 'var(--yc-shadow-2xl), 0 0 0 2px var(--yc-color-primary)';
      this.updateSearchFieldOptions(fieldSelect);
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        searchBarWrapper.style.boxShadow = 'var(--yc-shadow-2xl)';
        // Only hide results if not clicking on them
        if (!resultsDropdown.matches(':hover')) {
          resultsDropdown.style.display = 'none';
        }
      }, 150);
    });

    // Real-time search as user types
    searchInput.addEventListener('input', () => {
      this.performGlobalSearch(searchInput.value, fieldSelect.value);
    });

    // Handle field change
    fieldSelect.addEventListener('change', () => {
      if (searchInput.value.trim()) {
        this.performGlobalSearch(searchInput.value, fieldSelect.value);
      }
      searchInput.focus();
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.blur();
        resultsDropdown.style.display = 'none';
        if (this.filterPopup) this.filterPopup.style.display = 'none';
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const firstResult = resultsDropdown.querySelector('.ychart-search-result-item') as HTMLElement;
        if (firstResult) firstResult.focus();
      }
    });

    // Close filter popup on outside click
    document.addEventListener('mousedown', (e) => {
      if (this.filterPopup && this.filterPopup.style.display !== 'none') {
        if (!this.filterPopup.contains(e.target as Node) && !(e.target as Element)?.closest('[data-id^="ychart-filter-btn"]')) {
          this.filterPopup.style.display = 'none';
        }
      }
    });

    this.floatingSearchBar = container;
    return container;
  }


private updateSearchFieldOptions(fieldSelect: HTMLSelectElement): void {
    const currentValue = fieldSelect.value;
    
    // Clear all options except "All Fields"
    while (fieldSelect.options.length > 1) {
      fieldSelect.remove(1);
    }

    // Get available fields
    const fields = this.getAvailableFields();
    fields.forEach(field => {
      const option = document.createElement('option');
      option.value = field;
      option.textContent = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      fieldSelect.appendChild(option);
    });

    // Restore selection if it still exists
    if (currentValue && Array.from(fieldSelect.options).some(opt => opt.value === currentValue)) {
      fieldSelect.value = currentValue;
    }
  }


private performGlobalSearch(query: string, field: string): void {
    if (!this.searchResultsDropdown || !this.ctx.getOrgChart()) return;

    const trimmedQuery = query.trim().toLowerCase();

    // If no query, hide results
    if (!trimmedQuery) {
      this.searchResultsDropdown.style.display = 'none';
      return;
    }

    const attrs = this.ctx.getOrgChart().getChartState();
    
    // Always search from truthData (full data), not the cropped chart data
    // This ensures search works correctly even when viewing a POI
    const allData = this.ctx.getTruthData().length > 0 ? this.ctx.getTruthData() : (attrs.data || []);

    // Perform search
    const matches: { node: any; score: number; matchedField: string }[] = [];

    allData.forEach((item: any) => {
      // Wrap the data item to look like a node for compatibility with displaySearchResults
      const node = { data: item };
      
      if (field === '__all__') {
        // Search across all fields
        let bestScore = 0;
        let bestField = '';
        
        Object.entries(item).forEach(([key, value]) => {
          if (key.startsWith('_') || value === null || value === undefined) return;
          
          const strValue = String(value).toLowerCase();
          const score = fuzzyMatch(trimmedQuery, strValue);
          
          if (score > bestScore) {
            bestScore = score;
            bestField = key;
          }
        });

        if (bestScore > 0) {
          matches.push({ node, score: bestScore, matchedField: bestField });
        }
      } else {
        // Search in specific field
        const fieldValue = item[field];
        if (fieldValue !== null && fieldValue !== undefined) {
          const score = fuzzyMatch(trimmedQuery, String(fieldValue).toLowerCase());
          if (score > 0) {
            matches.push({ node, score, matchedField: field });
          }
        }
      }
    });

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    // Limit results
    const limitedMatches = matches.slice(0, 10);

    // Display results
    this.displaySearchResults(limitedMatches, attrs);
  }


private displaySearchResults(matches: { node: any; score: number; matchedField: string }[], attrs: any): void {
    if (!this.searchResultsDropdown) return;

    this.searchResultsDropdown.innerHTML = '';

    if (matches.length === 0) {
      this.searchResultsDropdown.style.display = 'flex';
      const noResults = document.createElement('div');
      noResults.style.cssText = `
        padding: var(--yc-spacing-xl);
        text-align: center;
        color: var(--yc-color-text-muted);
        font-size: var(--yc-font-size-sm);
      `;
      noResults.textContent = 'No results found';
      this.searchResultsDropdown.appendChild(noResults);
      return;
    }

    this.searchResultsDropdown.style.display = 'flex';

    matches.forEach(({ node, score, matchedField }) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'ychart-search-result-item';
      resultItem.tabIndex = 0;
      resultItem.style.cssText = `
        padding: var(--yc-spacing-lg) var(--yc-spacing-xl);
        border-bottom: 1px solid var(--yc-color-button-bg);
        cursor: pointer;
        transition: background var(--yc-transition-fast);
        outline: none;
      `;

      const nodeData = node.data;
      const displayName = escapeHtml(nodeData.name || attrs.nodeId(nodeData));
      const displayTitle = escapeHtml(nodeData.title || '');
      const displayDept = escapeHtml(nodeData.department || '');
      const nodeId = String(nodeData.id);

      // Check if this node is currently the POI
      const isCurrentPOI = this.ctx.getPersonOfInterest() && String(this.ctx.getPersonOfInterest().id) === nodeId;

      resultItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--yc-spacing-md);">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: var(--yc-font-weight-semibold); color: var(--yc-color-text-heading); font-size: var(--yc-font-size-md); line-height: var(--yc-line-height-tight); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
            ${displayTitle ? `<div style="font-size: var(--yc-font-size-sm); line-height: var(--yc-line-height-tight); color: var(--yc-color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayTitle}</div>` : ''}
            ${displayDept ? `<div style="font-size: var(--yc-font-size-xs); line-height: var(--yc-line-height-tight); color: var(--yc-color-text-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayDept}</div>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: var(--yc-spacing-md); flex-shrink: 0;">
            <button class="ychart-set-poi-btn" data-node-id="${nodeId}" data-tooltip="${isCurrentPOI ? 'Current Person of Interest' : 'Set Person of Interest'}" style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              border: ${isCurrentPOI ? 'none' : 'var(--yc-border-width-thin) solid var(--yc-color-gray-400)'};
              border-radius: var(--yc-border-radius-md);
              background: ${isCurrentPOI ? 'var(--yc-color-primary)' : 'var(--yc-color-text-inverse)'};
              color: ${isCurrentPOI ? 'white' : 'var(--yc-color-text-secondary)'};
              cursor: pointer;
              transition: all var(--yc-transition-fast);
              box-shadow: ${isCurrentPOI ? 'none' : 'var(--yc-shadow-sm)'};
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <span class="ychart-tooltip" style="
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
              ">${isCurrentPOI ? 'Current Person of Interest' : 'Set Person of Interest'}</span>
              <span class="ychart-tooltip-arrow" style="
                position: absolute;
                top: calc(100% + 2px);
                left: 50%;
                transform: translateX(-50%) scale(0.8);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 6px solid var(--yc-color-overlay-dark);
                pointer-events: none;
                opacity: 0;
                transition: all var(--yc-transition-fast) var(--yc-transition-bounce);
                z-index: var(--yc-z-index-search-popup);
              "></span>
            </button>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
              <span style="font-size: var(--yc-font-size-xs); color: var(--yc-color-primary); font-weight: var(--yc-font-weight-semibold);">${Math.round(score * 100)}%</span>
              <span style="font-size: var(--yc-font-size-xs); color: var(--yc-color-text-light); background: var(--yc-color-button-bg); padding: 1px 6px; border-radius: var(--yc-border-radius-sm);">${matchedField}</span>
            </div>
          </div>
        </div>
      `;

      // Set POI button click handler
      const poiBtn = resultItem.querySelector('.ychart-set-poi-btn') as HTMLButtonElement;
      if (poiBtn) {
        poiBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent triggering the result item click
          this.ctx.setPersonOfInterest(nodeId);
          this.clearFloatingSearch();
          // Update the POI selector dropdown to reflect the change
          this.ctx.updatePOISelectorValue(nodeId);
        });

        // Hover effect for POI button with tooltip animation
        const poiTooltip = poiBtn.querySelector('.ychart-tooltip') as HTMLElement;
        const poiArrow = poiBtn.querySelector('.ychart-tooltip-arrow') as HTMLElement;
        poiBtn.addEventListener('mouseenter', () => {
          if (!isCurrentPOI) {
            poiBtn.style.background = 'var(--yc-color-primary)';
            poiBtn.style.color = 'white';
            poiBtn.style.borderColor = 'var(--yc-color-primary)';
            poiBtn.style.boxShadow = 'var(--yc-shadow-md)';
          }
          if (poiTooltip) {
            poiTooltip.style.opacity = '1';
            poiTooltip.style.transform = 'translateX(-50%) scale(1)';
          }
          if (poiArrow) {
            poiArrow.style.opacity = '1';
            poiArrow.style.transform = 'translateX(-50%) scale(1)';
          }
        });

        poiBtn.addEventListener('mouseleave', () => {
          if (!isCurrentPOI) {
            poiBtn.style.background = 'var(--yc-color-text-inverse)';
            poiBtn.style.color = 'var(--yc-color-text-secondary)';
            poiBtn.style.borderColor = 'var(--yc-color-gray-400)';
            poiBtn.style.boxShadow = 'var(--yc-shadow-sm)';
          }
          if (poiTooltip) {
            poiTooltip.style.opacity = '0';
            poiTooltip.style.transform = 'translateX(-50%) scale(0.8)';
          }
          if (poiArrow) {
            poiArrow.style.opacity = '0';
            poiArrow.style.transform = 'translateX(-50%) scale(0.8)';
          }
        });
      }

      // Hover effects
      resultItem.addEventListener('mouseenter', () => {
        resultItem.style.background = 'var(--yc-color-button-bg)';
      });

      resultItem.addEventListener('mouseleave', () => {
        resultItem.style.background = 'transparent';
      });

      resultItem.addEventListener('focus', () => {
        resultItem.style.background = 'var(--yc-color-button-bg)';
      });

      resultItem.addEventListener('blur', () => {
        resultItem.style.background = 'transparent';
      });

      // Click to select (navigate to node)
      resultItem.addEventListener('click', (e) => {
        // Don't trigger if clicking on the POI button
        if ((e.target as HTMLElement).closest('.ychart-set-poi-btn')) return;
        this.selectAndHighlightNode(node);
        this.clearFloatingSearch();
      });

      // Keyboard navigation
      resultItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectAndHighlightNode(node);
          this.clearFloatingSearch();
        } else if (e.key === 'p' || e.key === 'P') {
          // Press 'P' to set as POI
          e.preventDefault();
          this.ctx.setPersonOfInterest(nodeId);
          this.clearFloatingSearch();
          this.ctx.updatePOISelectorValue(nodeId);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = resultItem.nextElementSibling as HTMLElement;
          if (next && next.classList.contains('ychart-search-result-item')) {
            next.focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = resultItem.previousElementSibling as HTMLElement;
          if (prev && prev.classList.contains('ychart-search-result-item')) {
            prev.focus();
          } else {
            // Focus back to input
            const searchInput = this.floatingSearchBar?.querySelector('input') as HTMLInputElement;
            if (searchInput) searchInput.focus();
          }
        } else if (e.key === 'Escape') {
          this.clearFloatingSearch();
        }
      });

      this.searchResultsDropdown!.appendChild(resultItem);
    });
  }


private clearFloatingSearch(): void {
    if (this.floatingSearchBar) {
      const searchInput = this.floatingSearchBar.querySelector('input') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
      }
    }
    if (this.searchResultsDropdown) {
      this.searchResultsDropdown.style.display = 'none';
      this.searchResultsDropdown.innerHTML = '';
    }
  }


  createSearchPopup(): void {
    if (!this.ctx.getChartContainer()) return;

    const popup = document.createElement('div');
    popup.setAttribute('data-id', `ychart-search-popup-${this.ctx.instanceId}`);
    popup.style.cssText = `
      position: absolute;
      top: 5px;
      left: 50%;
      transform: translateX(-50%);
      display: none;
      z-index: 1000;
    `;

    const searchBox = document.createElement('div');
    searchBox.style.cssText = `
      background: var(--yc-color-bg-card);
      border-radius: var(--yc-border-radius-lg);
      padding: var(--yc-spacing-lg) var(--yc-spacing-2xl);
      box-shadow: var(--yc-shadow-4xl);
      width: var(--yc-width-search-popup);
      display: flex;
      flex-direction: column;
      gap: var(--yc-spacing-md);
      position: relative;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Search Nodes';
    title.style.cssText = `
      margin: 0;
      font-size: var(--yc-font-size-md);
      font-weight: var(--yc-font-weight-semibold);
      color: var(--yc-color-gray-900);
    `;

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 6px;
      align-items: center;
    `;

    // Search history burger button
    const historyButton = document.createElement('button');
    historyButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    `;
    historyButton.style.cssText = `
      position: relative;
      background: var(--yc-color-button-bg);
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      padding: 0;
    `;

    const historyTooltip = document.createElement('span');
    historyTooltip.textContent = 'Search History';
    historyTooltip.style.cssText = `
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 8px;
      background: var(--yc-color-overlay-dark);
      color: white;
      padding: var(--yc-spacing-button-padding-sm);
      border-radius: var(--yc-border-radius-sm);
      font-size: var(--yc-font-size-xs);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s;
      z-index: 1000;
    `;

    historyButton.appendChild(historyTooltip);

    historyButton.addEventListener('mouseenter', () => {
      historyButton.style.background = 'var(--yc-color-button-bg-hover)';
      historyButton.style.borderColor = 'var(--yc-color-primary)';
      historyTooltip.style.opacity = '1';
      historyTooltip.style.transform = 'scale(1)';
    });

    historyButton.addEventListener('mouseleave', () => {
      historyButton.style.background = 'var(--yc-color-button-bg)';
      historyButton.style.borderColor = 'var(--yc-color-button-border)';
      historyTooltip.style.opacity = '0';
      historyTooltip.style.transform = 'scale(0.8)';
    });

    historyButton.addEventListener('click', () => {
      this.toggleSearchHistory();
    });

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: var(--yc-font-size-3xl);
      color: var(--yc-color-text-light);
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--yc-border-radius-sm);
      transition: all 0.2s;
    `;
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'var(--yc-color-button-bg)';
      closeButton.style.color = 'var(--yc-color-icon)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'none';
      closeButton.style.color = 'var(--yc-color-text-light)';
    });
    closeButton.addEventListener('click', () => this.closeSearchPopup());

    buttonsContainer.appendChild(historyButton);
    buttonsContainer.appendChild(closeButton);

    header.appendChild(title);
    header.appendChild(buttonsContainer);

    // Filters container
    const filtersContainer = document.createElement('div');
    filtersContainer.setAttribute('data-id', 'search-filters');
    filtersContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    // Add initial filter row
    const initialFilter = this.createFilterRow(filtersContainer);
    filtersContainer.appendChild(initialFilter);

    // Add filter button
    const addFilterBtn = document.createElement('button');
    addFilterBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: var(--yc-spacing-xs);">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add Filter
    `;
    addFilterBtn.style.cssText = `
      padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
      background: var(--yc-color-button-bg);
      color: var(--yc-color-primary);
      border: 1px dashed var(--yc-color-button-border-hover);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-sm);
      font-weight: var(--yc-font-weight-semibold);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
    `;
    addFilterBtn.addEventListener('mouseenter', () => {
      addFilterBtn.style.background = 'var(--yc-color-button-bg-hover)';
      addFilterBtn.style.borderColor = 'var(--yc-color-primary)';
    });
    addFilterBtn.addEventListener('mouseleave', () => {
      addFilterBtn.style.background = 'var(--yc-color-button-bg)';
      addFilterBtn.style.borderColor = 'var(--yc-color-button-border-hover)';
    });
    addFilterBtn.addEventListener('click', () => {
      const newFilter = this.createFilterRow(filtersContainer);
      filtersContainer.insertBefore(newFilter, addFilterBtn);
    });

    filtersContainer.appendChild(addFilterBtn);

    // Suggestions container
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.setAttribute('data-id', 'search-suggestions');
    suggestionsContainer.style.cssText = `
      display: none;
      flex-direction: column;
      max-height: 150px;
      overflow-y: auto;
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      background: var(--yc-color-bg-card);
      box-shadow: 0 2px 8px var(--yc-color-shadow-light);
    `;

    searchBox.appendChild(header);
    searchBox.appendChild(filtersContainer);
    searchBox.appendChild(suggestionsContainer);

    popup.appendChild(searchBox);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.searchPopup && this.searchPopup.style.display !== 'none') {
        this.closeSearchPopup();
      }
    });

    this.ctx.getChartContainer()?.appendChild(popup);
    this.searchPopup = popup;
  }


private createFilterRow(container: HTMLElement): HTMLElement {
    const filterRow = document.createElement('div');
    filterRow.style.cssText = `
      display: flex;
      gap: 6px;
      align-items: center;
    `;

    // Field selector dropdown
    const fieldSelectContainer = document.createElement('div');
    fieldSelectContainer.setAttribute('data-id', 'filter-field-select');
    fieldSelectContainer.style.cssText = `min-width: 120px;`;

    // Track selected field value
    let selectedField = '';

    // Get available fields from schema or from data
    const fields = this.getAvailableFields();
    if (fields.length > 0) {
      selectedField = fields[0];
    }

    const fieldOptions = fields.map(field => ({
      label: field.charAt(0).toUpperCase() + field.slice(1),
      value: field,
    }));

    renderSelect(fieldSelectContainer, {
      options: fieldOptions,
      value: selectedField,
      placeholder: 'Field...',
      ariaLabel: 'Filter field',
      size: 'sm',
      onValueChange: (value: string) => {
        selectedField = value;
        // Re-trigger search with new field
        const input = filterRow.querySelector('input[type="text"]') as HTMLInputElement;
        if (input && input.value.trim()) {
          this.performFuzzySearch(input.value, selectedField);
        }
      },
    });

    // Expose the selected field via a getter on the container
    Object.defineProperty(fieldSelectContainer, 'value', {
      get: () => selectedField,
    });

    // Search input container with suggestions
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = `
      position: relative;
      flex: 1;
    `;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Type to search...';
    searchInput.style.cssText = `
      width: 100%;
      padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-base);
      outline: none;
      transition: border-color 0.2s;
    `;

    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = 'var(--yc-color-primary)';
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        searchInput.style.borderColor = 'var(--yc-color-button-border)';
      }, 200);
    });

    // Real-time search as user types
    searchInput.addEventListener('input', () => {
      this.performFuzzySearch(searchInput.value, selectedField);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSearchPopup();
      }
    });

    inputWrapper.appendChild(searchInput);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.style.cssText = `
      padding: 0;
      width: 28px;
      height: 28px;
      background: var(--yc-color-error-light);
      color: var(--yc-color-error-red-accent);
      border: 1px solid var(--yc-color-error-red-border);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-2xl);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;

    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.background = 'var(--yc-color-error-red-hover)';
    });

    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.background = 'var(--yc-color-error-light)';
    });

    removeBtn.addEventListener('click', () => {
      // Don't remove if it's the last filter
      const filters = container.querySelectorAll('[data-id="filter-row"]');
      if (filters.length > 1) {
        filterRow.remove();
        // Trigger search update
        this.performFuzzySearch('', '');
      }
    });

    filterRow.setAttribute('data-id', 'filter-row');
    filterRow.appendChild(fieldSelectContainer);
    filterRow.appendChild(inputWrapper);
    filterRow.appendChild(removeBtn);

    return filterRow;
  }


private getAvailableFields(): string[] {
    // Get fields from schema if available
    if (this.ctx.getCurrentSchema() && Object.keys(this.ctx.getCurrentSchema()).length > 0) {
      return Object.keys(this.ctx.getCurrentSchema()).filter(key => !key.startsWith('_'));
    }

    // Otherwise, get fields from data
    if (this.ctx.getOrgChart()) {
      const attrs = this.ctx.getOrgChart().getChartState();
      const allNodes = attrs.allNodes || [];
      if (allNodes.length > 0) {
        const fields = new Set<string>();
        allNodes.forEach((node: any) => {
          Object.keys(node.data).forEach(key => {
            if (!key.startsWith('_')) {
              fields.add(key);
            }
          });
        });
        return Array.from(fields).sort();
      }
    }

    // Default fields
    return ['name', 'title', 'email', 'department', 'location'];
  }


private performFuzzySearch(_query: string, _field: string): void {
    const suggestionsContainer = this.searchPopup?.querySelector('[data-id="search-suggestions"]') as HTMLElement;
    if (!suggestionsContainer || !this.ctx.getOrgChart()) return;

    // Get all filter inputs
    const filterRows = this.searchPopup?.querySelectorAll('[data-id="filter-row"]');
    if (!filterRows) return;

    const filters: { field: string; query: string }[] = [];
    filterRows.forEach(row => {
      const selectContainer = row.querySelector('[data-id="filter-field-select"]') as any;
      const input = row.querySelector('input') as HTMLInputElement;
      if (selectContainer && input && input.value.trim()) {
        filters.push({ field: selectContainer.value || '', query: input.value.trim().toLowerCase() });
      }
    });

    // If no filters have values, hide suggestions
    if (filters.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    // Save to search history (but only when there are actual results)
    // We'll save after we find matches

    const attrs = this.ctx.getOrgChart().getChartState();
    const allNodes = attrs.allNodes || [];

    // Perform fuzzy matching
    const matches: { node: any; score: number }[] = [];
    
    allNodes.forEach((node: any) => {
      let totalScore = 0;
      let matchCount = 0;

      filters.forEach(filter => {
        const fieldValue = node.data[filter.field];
        if (fieldValue) {
          const score = fuzzyMatch(filter.query, String(fieldValue).toLowerCase());
          if (score > 0) {
            totalScore += score;
            matchCount++;
          }
        }
      });

      // Only include if all filters match
      if (matchCount === filters.length) {
        matches.push({ node, score: totalScore / matchCount });
      }
    });

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    // Display suggestions
    suggestionsContainer.innerHTML = '';

    if (matches.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    suggestionsContainer.style.display = 'flex';

    matches.forEach(({ node, score }) => {
      const suggestionItem = document.createElement('div');
      suggestionItem.style.cssText = `
        padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
        border-bottom: 1px solid var(--yc-color-button-bg);
        cursor: pointer;
        transition: background 0.2s;
      `;

      const nodeData = node.data;
      const displayName = nodeData.name || attrs.nodeId(nodeData);
      const displayTitle = nodeData.title || '';
      const displayDept = nodeData.department || '';

      suggestionItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--yc-spacing-md);">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: var(--yc-font-weight-semibold); color: var(--yc-color-text-heading); font-size: var(--yc-font-size-sm); line-height: var(--yc-line-height-tight); margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
            ${displayTitle ? `<div style="font-size: var(--yc-font-size-xs); line-height: var(--yc-line-height-tight); color: var(--yc-color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayTitle}</div>` : ''}
            ${displayDept ? `<div style="font-size: var(--yc-font-size-xs); line-height: var(--yc-line-height-tight); color: var(--yc-color-text-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayDept}</div>` : ''}
          </div>
          <div style="font-size: var(--yc-font-size-xs); color: var(--yc-color-primary); font-weight: var(--yc-font-weight-semibold); flex-shrink: 0;">${Math.round(score * 100)}%</div>
        </div>
      `;

      suggestionItem.addEventListener('mouseenter', () => {
        suggestionItem.style.background = 'var(--yc-color-button-bg)';
      });

      suggestionItem.addEventListener('mouseleave', () => {
        suggestionItem.style.background = 'white';
      });

      suggestionItem.addEventListener('click', () => {
        this.selectAndHighlightNode(node);
        // Don't close popup, just clear inputs and suggestions
        const inputs = this.searchPopup?.querySelectorAll('input[type="text"]');
        inputs?.forEach((input: any) => {
          input.value = '';
        });
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
      });

      suggestionsContainer.appendChild(suggestionItem);
    });

  }


private closeSearchPopup(): void {
    if (this.searchPopup) {
      this.searchPopup.style.display = 'none';
      const suggestionsContainer = this.searchPopup.querySelector('[data-id="search-suggestions"]') as HTMLElement;
      if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
      }
      const inputs = this.searchPopup.querySelectorAll('input[type="text"]');
      inputs.forEach((input: any) => {
        input.value = '';
      });
    }
    // Also close history popup
    if (this.searchHistoryPopup) {
      this.searchHistoryPopup.style.display = 'none';
    }
  }


private toggleFilterPopup(): void {
    if (!this.filterPopup) {
      this.createFilterPopup();
    }
    if (!this.filterPopup) return;
    const isVisible = this.filterPopup.style.display !== 'none';
    this.filterPopup.style.display = isVisible ? 'none' : 'block';
  }


private createFilterPopup(): void {
    const searchContainer = this.floatingSearchBar;
    if (!searchContainer) return;

    const popup = document.createElement('div');
    popup.setAttribute('data-id', `ychart-filter-popup-${this.ctx.instanceId}`);
    popup.style.cssText = `
      display: none;
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: var(--yc-spacing-sm);
      background: var(--yc-color-bg-card);
      border-radius: var(--yc-border-radius-lg);
      box-shadow: var(--yc-shadow-4xl);
      border: 1px solid var(--yc-color-shadow-light);
      padding: var(--yc-spacing-lg);
      min-width: 300px;
      max-width: 400px;
      z-index: 1001;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--yc-spacing-md);`;
    const title = document.createElement('span');
    title.textContent = 'Filter by Field';
    title.style.cssText = `font-size: var(--yc-font-size-sm); font-weight: var(--yc-font-weight-semibold); color: var(--yc-color-text-heading);`;
    header.appendChild(title);
    popup.appendChild(header);

    // Field selector
    const fieldSelectWrapper = document.createElement('div');
    fieldSelectWrapper.style.cssText = `margin-bottom: var(--yc-spacing-md);`;

    const fieldLabel = document.createElement('label');
    fieldLabel.textContent = 'Select field';
    fieldLabel.style.cssText = `display: block; font-size: var(--yc-font-size-xs); color: var(--yc-color-text-muted); margin-bottom: var(--yc-spacing-xs);`;

    const fieldSelect = document.createElement('select');
    fieldSelect.setAttribute('aria-label', 'Select field to filter by');
    fieldSelect.style.cssText = `
      width: 100%;
      padding: var(--yc-spacing-sm) var(--yc-spacing-md);
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-sm);
      background: var(--yc-color-bg-card);
      color: var(--yc-color-text-primary);
      outline: none;
      cursor: pointer;
    `;
    fieldSelect.addEventListener('focus', () => { fieldSelect.style.borderColor = 'var(--yc-color-primary)'; });
    fieldSelect.addEventListener('blur', () => { fieldSelect.style.borderColor = 'var(--yc-color-button-border)'; });

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = '— Choose a field —';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    fieldSelect.appendChild(placeholderOption);

    fieldSelectWrapper.appendChild(fieldLabel);
    fieldSelectWrapper.appendChild(fieldSelect);
    popup.appendChild(fieldSelectWrapper);

    // Value search input
    const valueInputWrapper = document.createElement('div');
    valueInputWrapper.style.cssText = `display: none; margin-bottom: var(--yc-spacing-md);`;

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Search values...';
    valueInput.setAttribute('aria-label', 'Search filter values');
    valueInput.style.cssText = `
      width: 100%;
      padding: var(--yc-spacing-sm) var(--yc-spacing-md);
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      font-size: var(--yc-font-size-sm);
      outline: none;
      box-sizing: border-box;
    `;
    valueInput.addEventListener('focus', () => { valueInput.style.borderColor = 'var(--yc-color-primary)'; });
    valueInput.addEventListener('blur', () => { valueInput.style.borderColor = 'var(--yc-color-button-border)'; });

    valueInputWrapper.appendChild(valueInput);
    popup.appendChild(valueInputWrapper);

    // Values dropdown list
    const valuesDropdown = document.createElement('div');
    valuesDropdown.style.cssText = `
      display: none;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      background: var(--yc-color-bg-card);
      margin-bottom: var(--yc-spacing-md);
    `;
    popup.appendChild(valuesDropdown);

    // Selected values badges inside popup
    const selectedBadges = document.createElement('div');
    selectedBadges.setAttribute('data-id', 'filter-selected-badges');
    selectedBadges.style.cssText = `
      display: none;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: var(--yc-spacing-md);
    `;
    popup.appendChild(selectedBadges);

    // Footer with Apply and Clear buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: var(--yc-spacing-sm);
      padding-top: var(--yc-spacing-md);
      border-top: 1px solid var(--yc-color-button-border);
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.setAttribute('aria-label', 'Clear all filters');
    clearBtn.style.cssText = `
      padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
      border: 1px solid var(--yc-color-button-border);
      border-radius: var(--yc-border-radius-md);
      background: var(--yc-color-bg-card);
      color: var(--yc-color-text-primary);
      font-size: var(--yc-font-size-sm);
      cursor: pointer;
      transition: background 0.15s;
    `;
    clearBtn.addEventListener('mouseenter', () => { clearBtn.style.background = 'var(--yc-color-button-bg)'; });
    clearBtn.addEventListener('mouseleave', () => { clearBtn.style.background = 'var(--yc-color-bg-card)'; });
    clearBtn.addEventListener('click', () => {
      this.clearAllFieldFilters();
      this.renderFilterPopupBadges(fieldSelect.value, selectedBadges);
    });

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.setAttribute('aria-label', 'Apply filters');
    applyBtn.style.cssText = `
      padding: var(--yc-spacing-sm) var(--yc-spacing-lg);
      border: none;
      border-radius: var(--yc-border-radius-md);
      background: var(--yc-color-primary);
      color: white;
      font-size: var(--yc-font-size-sm);
      font-weight: var(--yc-font-weight-semibold);
      cursor: pointer;
      transition: opacity 0.15s;
    `;
    applyBtn.addEventListener('mouseenter', () => { applyBtn.style.opacity = '0.85'; });
    applyBtn.addEventListener('mouseleave', () => { applyBtn.style.opacity = '1'; });
    applyBtn.addEventListener('click', () => {
      this.renderFilterBadges();
      this.applyFieldFilters();
      this.filterPopup!.style.display = 'none';
    });

    footer.appendChild(clearBtn);
    footer.appendChild(applyBtn);
    popup.appendChild(footer);

    // Field change: populate values
    fieldSelect.addEventListener('change', () => {
      const field = fieldSelect.value;
      if (!field) return;
      valueInputWrapper.style.display = 'block';
      valueInput.value = '';
      valueInput.placeholder = `Search ${field} values...`;
      this.populateFilterValues(field, '', valuesDropdown, selectedBadges);
      this.renderFilterPopupBadges(field, selectedBadges);
      valueInput.focus();
    });

    // Input search: fuzzy filter the values list
    valueInput.addEventListener('input', () => {
      const field = fieldSelect.value;
      if (!field) return;
      this.populateFilterValues(field, valueInput.value, valuesDropdown, selectedBadges);
    });

    searchContainer.appendChild(popup);
    this.filterPopup = popup;

    // Populate field options now
    this.updateFilterFieldOptions(fieldSelect);
  }


private updateFilterFieldOptions(fieldSelect: HTMLSelectElement): void {
    // Keep only the placeholder option
    while (fieldSelect.options.length > 1) {
      fieldSelect.remove(1);
    }
    const fields = this.getAvailableFields();
    fields.forEach(field => {
      const opt = document.createElement('option');
      opt.value = field;
      opt.textContent = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      fieldSelect.appendChild(opt);
    });
  }


private populateFilterValues(field: string, query: string, dropdown: HTMLElement, _selectedBadges: HTMLElement): void {
    dropdown.innerHTML = '';

    // Gather all unique values for this field from truthData
    const valueSet = new Set<string>();
    this.ctx.getTruthData().forEach(item => {
      const val = item[field];
      if (val !== null && val !== undefined && String(val).trim()) {
        valueSet.add(String(val).trim());
      }
    });

    let values = Array.from(valueSet).sort();

    // Fuzzy filter if query is provided
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      values = values
        .map(v => ({ value: v, score: fuzzyMatch(q, v.toLowerCase()) }))
        .filter(v => v.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(v => v.value);
    }

    if (values.length === 0) {
      dropdown.style.display = 'block';
      const noItems = document.createElement('div');
      noItems.textContent = 'No matching values';
      noItems.style.cssText = `padding: var(--yc-spacing-md); text-align: center; color: var(--yc-color-text-muted); font-size: var(--yc-font-size-sm);`;
      dropdown.appendChild(noItems);
      return;
    }

    dropdown.style.display = 'block';
    const currentSelected = this.activeFieldFilters.get(field) || new Set<string>();

    values.forEach(val => {
      const isSelected = currentSelected.has(val);
      const item = document.createElement('div');
      item.style.cssText = `
        padding: var(--yc-spacing-sm) var(--yc-spacing-md);
        font-size: var(--yc-font-size-sm);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--yc-spacing-sm);
        transition: background 0.15s;
        background: ${isSelected ? 'var(--yc-color-button-bg-hover)' : 'transparent'};
      `;

      const checkbox = document.createElement('span');
      checkbox.innerHTML = isSelected
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--yc-color-primary)" stroke="white" stroke-width="3"><rect x="2" y="2" width="20" height="20" rx="4"/><polyline points="6 12 10 16 18 8"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4"/></svg>`;
      checkbox.style.cssText = `flex-shrink: 0; display: flex;`;

      const label = document.createElement('span');
      label.textContent = val;
      label.style.cssText = `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;

      item.appendChild(checkbox);
      item.appendChild(label);

      item.addEventListener('mouseenter', () => { item.style.background = 'var(--yc-color-button-bg)'; });
      item.addEventListener('mouseleave', () => { item.style.background = isSelected ? 'var(--yc-color-button-bg-hover)' : 'transparent'; });

      item.addEventListener('click', () => {
        if (isSelected) {
          currentSelected.delete(val);
        } else {
          currentSelected.add(val);
        }
        if (currentSelected.size === 0) {
          this.activeFieldFilters.delete(field);
        } else {
          this.activeFieldFilters.set(field, currentSelected);
        }
        // Refresh the values list to update checkboxes
        const queryInput = this.filterPopup?.querySelector('input[type="text"]') as HTMLInputElement;
        this.populateFilterValues(field, queryInput?.value || '', dropdown, _selectedBadges);
        // Update selected badges in popup
        this.renderFilterPopupBadges(field, _selectedBadges);
      });

      dropdown.appendChild(item);
    });
  }


private renderFilterBadges(): void {
    const funnelBtn = this.floatingSearchBar?.querySelector('[data-id^="ychart-filter-btn"]') as HTMLElement;
    if (!funnelBtn) return;

    const totalFilters = Array.from(this.activeFieldFilters.values()).reduce((sum, set) => sum + set.size, 0);

    // Remove existing badge if any
    const existingBadge = funnelBtn.querySelector('.filter-count-badge');
    if (existingBadge) existingBadge.remove();

    if (totalFilters === 0) {
      funnelBtn.style.color = 'var(--yc-color-text-muted)';
      return;
    }

    funnelBtn.style.color = 'var(--yc-color-primary)';

    // Add count badge
    const badge = document.createElement('span');
    badge.className = 'filter-count-badge';
    badge.textContent = String(totalFilters);
    badge.style.cssText = `
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 16px;
      height: 16px;
      background: var(--yc-color-primary);
      color: white;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      line-height: 1;
      pointer-events: none;
    `;
    funnelBtn.appendChild(badge);
  }


private renderFilterPopupBadges(field: string, badgesContainer: HTMLElement): void {
    badgesContainer.innerHTML = '';
    const selected = this.activeFieldFilters.get(field);

    if (!selected || selected.size === 0) {
      badgesContainer.style.display = 'none';
      return;
    }

    badgesContainer.style.display = 'flex';

    selected.forEach(val => {
      const badge = document.createElement('span');
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: color-mix(in srgb, var(--yc-color-primary) 15%, transparent);
        color: var(--yc-color-primary);
        border-radius: var(--yc-border-radius-pill);
        font-size: var(--yc-font-size-xs, 11px);
        white-space: nowrap;
        max-width: 160px;
      `;

      const label = document.createElement('span');
      label.textContent = val;
      label.style.cssText = `overflow: hidden; text-overflow: ellipsis;`;

      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '×';
      removeBtn.setAttribute('aria-label', `Remove filter ${val}`);
      removeBtn.style.cssText = `
        background: none; border: none; color: var(--yc-color-text-muted);
        cursor: pointer; padding: 0; font-size: 14px; line-height: 1;
        display: flex; align-items: center;
      `;
      removeBtn.addEventListener('mouseenter', () => { removeBtn.style.color = 'var(--yc-color-error-red-accent, #ef4444)'; });
      removeBtn.addEventListener('mouseleave', () => { removeBtn.style.color = 'var(--yc-color-text-muted)'; });
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selected.delete(val);
        if (selected.size === 0) this.activeFieldFilters.delete(field);
        this.renderFilterPopupBadges(field, badgesContainer);
        // Refresh dropdown checkboxes
        const dropdown = this.filterPopup?.querySelector('[style*="max-height: 200px"]') as HTMLElement;
        const queryInput = this.filterPopup?.querySelector('input[type="text"]') as HTMLInputElement;
        if (dropdown) this.populateFilterValues(field, queryInput?.value || '', dropdown, badgesContainer);
      });

      badge.appendChild(label);
      badge.appendChild(removeBtn);
      badgesContainer.appendChild(badge);
    });
  }


private clearAllFieldFilters(): void {
    this.activeFieldFilters.clear();
    this.renderFilterBadges();
    this.applyFieldFilters();
    // Reset filter popup if open
    if (this.filterPopup && this.filterPopup.style.display !== 'none') {
      const fieldSelect = this.filterPopup.querySelector('select') as HTMLSelectElement;
      if (fieldSelect) fieldSelect.selectedIndex = 0;
      const valueInputWrapper = this.filterPopup.querySelector('input[type="text"]')?.parentElement as HTMLElement;
      if (valueInputWrapper) valueInputWrapper.style.display = 'none';
      const valuesDropdown = this.filterPopup.querySelector('[style*="max-height: 200px"]') as HTMLElement;
      if (valuesDropdown) { valuesDropdown.innerHTML = ''; valuesDropdown.style.display = 'none'; }
      const selectedBadges = this.filterPopup.querySelector('[data-id="filter-selected-badges"]') as HTMLElement;
      if (selectedBadges) { selectedBadges.innerHTML = ''; selectedBadges.style.display = 'none'; }
    }
  }


private applyFieldFilters(): void {
    if (!this.ctx.getOrgChart()) return;

    const totalFilters = Array.from(this.activeFieldFilters.values()).reduce((sum, set) => sum + set.size, 0);

    if (totalFilters === 0) {
      // No filters: clear highlighting and reset to root
      const orgChart = this.ctx.getOrgChart();
      if (orgChart) orgChart.clearHighlighting();
      this.ctx.resetToRoot();
      return;
    }

    // Find matching node ids from truthData
    const matchedIds: any[] = [];
    this.ctx.getTruthData().forEach(item => {
      let matches = true;
      this.activeFieldFilters.forEach((values, field) => {
        const nodeVal = item[field];
        if (nodeVal === null || nodeVal === undefined) {
          matches = false;
        } else if (!values.has(String(nodeVal).trim())) {
          matches = false;
        }
      });
      if (matches) matchedIds.push(item.id);
    });

    if (matchedIds.length === 0) return;

    // Collapse all nodes first
    const attrs = this.ctx.getOrgChart().getChartState();
    attrs.allNodes.forEach((d: any) => {
      d.data._expanded = false;
      d.data._highlighted = false;
      d.data._upToTheRootHighlighted = false;
    });

    // Highlight matched nodes (this expands their ancestor chains)
    matchedIds.forEach(id => {
      this.ctx.getOrgChart()!.setHighlighted(id);
    });

    // Re-render and fit
    this.ctx.getOrgChart().render();
    setTimeout(() => {
      if (this.ctx.getOrgChart()) this.ctx.getOrgChart().fit();
    }, 300);
  }


private toggleSearchHistory(): void {
    if (!this.searchHistoryPopup) {
      this.createSearchHistoryPopup();
    }
    
    if (this.searchHistoryPopup) {
      const isVisible = this.searchHistoryPopup.style.display !== 'none';
      if (isVisible) {
        this.searchHistoryPopup.style.display = 'none';
      } else {
        this.updateSearchHistoryDisplay();
        this.searchHistoryPopup.style.display = 'block';
      }
    }
  }


private createSearchHistoryPopup(): void {
    if (!this.ctx.getChartContainer() || !this.searchPopup) return;

    const historyPopup = document.createElement('div');
    historyPopup.setAttribute('data-id', `ychart-search-history-${this.ctx.instanceId}`);
    historyPopup.style.cssText = `
      position: absolute;
      top: calc(100% + 5px);
      left: 50%;
      transform: translateX(-50%);
      display: none;
      z-index: 999;
    `;

    const historyBox = document.createElement('div');
    historyBox.style.cssText = `
      background: var(--yc-color-bg-card);
      border-radius: var(--yc-border-radius-lg);
      padding: 10px 14px;
      box-shadow: 0 4px 16px var(--yc-color-shadow-dark);
      width: 500px;
      max-height: 300px;
      display: flex;
      flex-direction: column;
      gap: var(--yc-spacing-md);
    `;

    const historyHeader = document.createElement('div');
    historyHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    `;

    const historyTitle = document.createElement('h4');
    historyTitle.textContent = 'Search History';
    historyTitle.style.cssText = `
      margin: 0;
      font-size: var(--yc-font-size-base);
      font-weight: var(--yc-font-weight-semibold);
      color: var(--yc-color-gray-900);
    `;

    const clearAllButton = document.createElement('button');
    clearAllButton.textContent = 'Clear All';
    clearAllButton.style.cssText = `
      background: var(--yc-color-error-light);
      color: var(--yc-color-error-red-accent);
      border: 1px solid var(--yc-color-error-red-border);
      border-radius: var(--yc-border-radius-md);
      padding: 4px 10px;
      font-size: var(--yc-font-size-xs);
      font-weight: var(--yc-font-weight-semibold);
      cursor: pointer;
      transition: all 0.2s;
    `;

    clearAllButton.addEventListener('mouseenter', () => {
      clearAllButton.style.background = 'var(--yc-color-error-red-hover)';
    });

    clearAllButton.addEventListener('mouseleave', () => {
      clearAllButton.style.background = 'var(--yc-color-error-light)';
    });

    clearAllButton.addEventListener('click', () => {
      this.clearSearchHistory();
    });

    historyHeader.appendChild(historyTitle);
    historyHeader.appendChild(clearAllButton);

    const historyList = document.createElement('div');
    historyList.setAttribute('data-id', 'history-list');
    historyList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 250px;
      overflow-y: auto;
    `;

    historyBox.appendChild(historyHeader);
    historyBox.appendChild(historyList);
    historyPopup.appendChild(historyBox);

    this.searchPopup.appendChild(historyPopup);
    this.searchHistoryPopup = historyPopup;
  }


private updateSearchHistoryDisplay(): void {
    if (!this.searchHistoryPopup) return;

    const historyList = this.searchHistoryPopup.querySelector('[data-id="history-list"]') as HTMLElement;
    if (!historyList) return;

    historyList.innerHTML = '';

    const history = this.loadSearchHistory();

    if (history.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = 'No search history';
      emptyMessage.style.cssText = `
        padding: 20px;
        text-align: center;
        color: var(--yc-color-text-light);
        font-size: var(--yc-font-size-sm);
      `;
      historyList.appendChild(emptyMessage);
      return;
    }

    history.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: var(--yc-spacing-md);
        padding: 8px 10px;
        background: var(--yc-color-button-bg);
        border: 1px solid var(--yc-color-button-border);
        border-radius: var(--yc-border-radius-md);
        transition: all 0.2s;
        cursor: pointer;
      `;

      const historyContent = document.createElement('div');
      historyContent.style.cssText = `
        flex: 1;
        min-width: 0;
      `;

      const searchText = `${item.field}: "${item.query}"`;
      const nodeInfo = item.nodeName ? ` → ${item.nodeName}` : '';
      const timestamp = new Date(item.timestamp).toLocaleString();

      historyContent.innerHTML = `
        <div style="font-size: var(--yc-font-size-sm); color: var(--yc-color-text-heading); font-weight: var(--yc-font-weight-medium); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${searchText}${nodeInfo}</div>
        <div style="font-size: var(--yc-font-size-xs); color: var(--yc-color-text-light);">${timestamp}</div>
      `;

      const removeButton = document.createElement('button');
      removeButton.innerHTML = '×';
      removeButton.style.cssText = `
        background: var(--yc-color-error-light);
        color: var(--yc-color-error-red-accent);
        border: 1px solid var(--yc-color-error-red-border);
        border-radius: var(--yc-border-radius-sm);
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        font-size: var(--yc-font-size-xl);
        flex-shrink: 0;
      `;

      removeButton.addEventListener('mouseenter', () => {
        removeButton.style.background = 'var(--yc-color-error-red-hover)';
      });

      removeButton.addEventListener('mouseleave', () => {
        removeButton.style.background = 'var(--yc-color-error-light)';
      });

      removeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeHistoryItem(index);
      });

      historyItem.addEventListener('mouseenter', () => {
        historyItem.style.background = 'var(--yc-color-button-bg-hover)';
        historyItem.style.borderColor = 'var(--yc-color-button-border-hover)';
      });

      historyItem.addEventListener('mouseleave', () => {
        historyItem.style.background = 'var(--yc-color-button-bg)';
        historyItem.style.borderColor = 'var(--yc-color-button-border)';
      });

      historyItem.addEventListener('click', () => {
        this.applyHistorySearch(item);
      });

      historyItem.appendChild(historyContent);
      historyItem.appendChild(removeButton);
      historyList.appendChild(historyItem);
    });
  }


private getSearchHistoryKey(): string {
    return `ychart-search-history-${this.ctx.instanceId}`;
  }


private loadSearchHistory(): Array<{ field: string; query: string; nodeId?: string; nodeName?: string; timestamp: number }> {
    try {
      const stored = localStorage.getItem(this.getSearchHistoryKey());
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
    return [];
  }


private clearSearchHistory(): void {
    try {
      localStorage.removeItem(this.getSearchHistoryKey());
      this.updateSearchHistoryDisplay();
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }


private removeHistoryItem(index: number): void {
    try {
      const history = this.loadSearchHistory();
      history.splice(index, 1);
      localStorage.setItem(this.getSearchHistoryKey(), JSON.stringify(history));
      this.updateSearchHistoryDisplay();
    } catch (error) {
      console.warn('Failed to remove history item:', error);
    }
  }


private applyHistorySearch(historyItem: { field: string; query: string; nodeId?: string; nodeName?: string; timestamp: number }): void {
    if (!this.searchPopup) return;

    const filtersContainer = this.searchPopup.querySelector('[data-id="search-filters"]') as HTMLElement;
    if (!filtersContainer) return;

    // Remove all existing filter rows except the add button
    const existingFilters = filtersContainer.querySelectorAll('[data-id="filter-row"]');
    existingFilters.forEach(filter => filter.remove());

    const addButton = filtersContainer.querySelector('button');

    // Add single filter row based on history
    const filterRow = this.createFilterRow(filtersContainer);
    const select = filterRow.querySelector('select') as HTMLSelectElement;
    const input = filterRow.querySelector('input') as HTMLInputElement;

    if (select && input) {
      select.value = historyItem.field;
      input.value = historyItem.query;
    }

    if (addButton) {
      filtersContainer.insertBefore(filterRow, addButton);
    } else {
      filtersContainer.appendChild(filterRow);
    }

    // Trigger search
    this.performFuzzySearch(historyItem.query, historyItem.field);

    // Close history popup
    if (this.searchHistoryPopup) {
      this.searchHistoryPopup.style.display = 'none';
    }
  }




private selectAndHighlightNode(node: any): void {
    if (!this.ctx.getOrgChart()) return;

    const attrs = this.ctx.getOrgChart().getChartState();
    const nodeId = attrs.nodeId(node.data);

    // Save to search history
    this.saveSearchToHistory(node);

    // Use setCentered to properly expand ancestors and center the node
    if (typeof this.ctx.getOrgChart().setCentered === 'function') {
      this.ctx.getOrgChart().setCentered(nodeId);
    }

    // Set as selected node
    attrs.selectedNodeId = nodeId;

    // Re-render the chart with the centered and expanded node
    this.ctx.getOrgChart().render();

    // Focus the SVG to enable keyboard navigation
    setTimeout(() => {
      const svg = attrs.svg?.node();
      if (svg) {
        svg.focus();
      }
    }, 100);

    // Call onNodeSelect callback if available
    if (attrs.onNodeSelect) {
      attrs.onNodeSelect(nodeId);
    }

    // Fit the view to center on the selected node after rendering completes
    setTimeout(() => {
      if (this.ctx.getOrgChart() && typeof this.ctx.getOrgChart().fit === 'function') {
        // Get the updated node from the tree after rendering
        const updatedAttrs = this.ctx.getOrgChart().getChartState();
        const updatedRoot = updatedAttrs.root;
        const descendants = updatedRoot.descendants();
        const updatedNode = descendants.find((d: any) => attrs.nodeId(d.data) === nodeId);
        
        if (updatedNode) {
          this.ctx.getOrgChart().fit({ nodes: [updatedNode], animate: true });
        }
      }
    }, 400);
  }


private saveSearchToHistory(node: any): void {
    if (!this.searchPopup) return;

    // Get current filter values (just use the first one that has a value)
    const filterRows = this.searchPopup.querySelectorAll('[data-id="filter-row"]');
    let field = '';
    let query = '';

    for (const row of Array.from(filterRows)) {
      const select = row.querySelector('select') as HTMLSelectElement;
      const input = row.querySelector('input') as HTMLInputElement;
      if (select && input && input.value.trim()) {
        field = select.value;
        query = input.value.trim();
        break; // Only take the first active filter
      }
    }

    if (!field || !query) return;

    try {
      const history = this.loadSearchHistory();
      const nodeData = node.data;
      const nodeName = nodeData.name || '';
      const attrs = this.ctx.getOrgChart()?.getChartState();
      const nodeId = attrs ? attrs.nodeId(nodeData) : '';
      
      // Check if this exact search already exists
      const isDuplicate = history.some(item => 
        item.field === field && item.query === query && item.nodeId === nodeId
      );

      if (!isDuplicate) {
        // Add new search to beginning of array
        history.unshift({
          field,
          query,
          nodeId,
          nodeName,
          timestamp: Date.now()
        });

        // Keep only last 20 searches
        const trimmedHistory = history.slice(0, 20);
        
        localStorage.setItem(this.getSearchHistoryKey(), JSON.stringify(trimmedHistory));
      }
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }




/**
   * Focus the floating search bar
   */
  focusFloatingSearch(): void {
    if (this.floatingSearchBar) {
      const searchInput = this.floatingSearchBar.querySelector('input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  }


}
