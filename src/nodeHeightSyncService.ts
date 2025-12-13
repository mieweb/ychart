/**
 * Node Height Synchronization Service
 * 
 * Ensures all nodes in the org chart have the same height by:
 * 1. Allowing content to flow naturally (fit-content via CSS)
 * 2. Measuring all node heights after initial render
 * 3. Finding the maximum height across all nodes
 * 4. Applying that height uniformly to all nodes
 * 
 * This creates a consistent, aligned appearance while respecting content needs.
 * If one node has more content and needs 200px, ALL nodes will be 200px.
 * 
 * Usage:
 * ```typescript
 * const service = new NodeHeightSyncService(svgElement, {
 *   minHeight: 110,
 *   maxHeight: 500,
 *   onHeightChange: (height) => console.log(`Synced to ${height}px`)
 * });
 * service.init();
 * 
 * // Later, after data changes:
 * service.triggerSync();
 * 
 * // Cleanup:
 * service.destroy();
 * ```
 */

export interface NodeHeightSyncConfig {
  /** Minimum height for nodes (default: 80) */
  minHeight?: number;
  /** Maximum height for nodes (default: none) */
  maxHeight?: number;
  /** Padding to add to calculated height (default: 0) */
  heightPadding?: number;
  /** Debounce delay for resize events in ms (default: 150) */
  resizeDebounce?: number;
  /** Callback when height changes */
  onHeightChange?: (newHeight: number) => void;
}

export class NodeHeightSyncService {
  private container: HTMLElement | SVGElement;
  private config: Required<NodeHeightSyncConfig>;
  private resizeObserver?: ResizeObserver;
  private resizeTimeout?: number;
  private currentUnifiedHeight: number = 0;

  constructor(
    container: HTMLElement | SVGElement,
    config: NodeHeightSyncConfig = {}
  ) {
    this.container = container;
    this.config = {
      minHeight: config.minHeight ?? 80,
      maxHeight: config.maxHeight ?? Infinity,
      heightPadding: config.heightPadding ?? 0,
      resizeDebounce: config.resizeDebounce ?? 150,
      onHeightChange: config.onHeightChange ?? (() => {}),
    };
  }

  /**
   * Initialize height synchronization
   * Sets up observers and performs initial sync
   */
  init(): void {
    this.syncNodeHeights();
    this.observeContentChanges();
  }

  /**
   * Measure and synchronize all node heights
   * @returns The unified height applied to all nodes
   */
  syncNodeHeights(): number {
    // Step 1: Reset heights to 'auto' to measure natural content height
    this.resetHeightsToAuto();

    // Step 2: Measure all node content heights
    const maxHeight = this.measureMaxContentHeight();

    // Step 3: Apply unified height to all nodes
    this.applyUnifiedHeight(maxHeight);

    // Step 4: Store and notify
    this.currentUnifiedHeight = maxHeight;
    this.config.onHeightChange(maxHeight);

    return maxHeight;
  }

  /**
   * Reset all foreignObject and content div heights to 'auto' for measurement
   */
  private resetHeightsToAuto(): void {
    const foreignObjects = this.container.querySelectorAll<SVGForeignObjectElement>(
      'foreignObject.node-foreign-object'
    );

    foreignObjects.forEach((fo) => {
      // Set foreignObject height to auto
      fo.style.height = 'auto';
      fo.removeAttribute('height');

      // Set content divs to auto
      const contentDiv = fo.querySelector<HTMLDivElement>('.node-foreign-object-div');
      if (contentDiv) {
        contentDiv.style.height = 'auto';
        contentDiv.style.minHeight = 'auto';
      }

      const innerDiv = contentDiv?.querySelector<HTMLDivElement>('div');
      if (innerDiv) {
        innerDiv.style.height = 'auto';
        innerDiv.style.minHeight = 'auto';
      }
    });
  }

  /**
   * Measure the maximum content height across all nodes
   * @returns Maximum height found
   */
  private measureMaxContentHeight(): number {
    const foreignObjects = this.container.querySelectorAll<SVGForeignObjectElement>(
      'foreignObject.node-foreign-object'
    );

    let maxHeight = this.config.minHeight;

    foreignObjects.forEach((fo) => {
      // Get the content div
      const contentDiv = fo.querySelector<HTMLDivElement>('.node-foreign-object-div');
      if (!contentDiv) return;

      // Force a reflow to ensure accurate measurement
      contentDiv.offsetHeight;

      // Measure the actual scrollHeight (full content height)
      const contentHeight = contentDiv.scrollHeight;

      // Update max height
      if (contentHeight > maxHeight) {
        maxHeight = contentHeight;
      }
    });

    // Apply padding and constraints
    maxHeight += this.config.heightPadding;
    maxHeight = Math.min(maxHeight, this.config.maxHeight);
    maxHeight = Math.max(maxHeight, this.config.minHeight);

    return Math.ceil(maxHeight);
  }

  /**
   * Apply the unified height to all nodes
   * @param height The height to apply
   */
  private applyUnifiedHeight(height: number): void {
    const foreignObjects = this.container.querySelectorAll<SVGForeignObjectElement>(
      'foreignObject.node-foreign-object'
    );

    foreignObjects.forEach((fo) => {
      // Mark as synced for CSS targeting
      fo.setAttribute('data-height-synced', 'true');
      
      // Set foreignObject height
      fo.setAttribute('height', String(height));
      fo.style.height = `${height}px`;

      // Set content div heights
      const contentDiv = fo.querySelector<HTMLDivElement>('.node-foreign-object-div');
      if (contentDiv) {
        contentDiv.setAttribute('data-height-synced', 'true');
        contentDiv.style.height = `${height}px`;
        contentDiv.style.minHeight = `${height}px`;
      }

      const innerDiv = contentDiv?.querySelector<HTMLDivElement>('div');
      if (innerDiv) {
        innerDiv.style.height = `${height}px`;
        innerDiv.style.minHeight = `${height}px`;
      }
    });

    // Also update any data-driven height attributes (for d3-org-chart)
    this.updateNodeDataHeights(height);
  }

  /**
   * Update the data-driven height values for d3-org-chart nodes
   * @param height The height to set
   */
  private updateNodeDataHeights(height: number): void {
    const nodeGroups = this.container.querySelectorAll<SVGGElement>('.node');
    
    nodeGroups.forEach((nodeGroup) => {
      const node = nodeGroup as any;
      if (node.__data__) {
        node.__data__.height = height;
      }
    });
  }

  /**
   * Observe content changes and trigger re-sync
   */
  private observeContentChanges(): void {
    // Use ResizeObserver to watch for content size changes
    this.resizeObserver = new ResizeObserver(() => {
      this.debouncedSync();
    });

    // Observe all node content divs
    const contentDivs = this.container.querySelectorAll('.node-foreign-object-div');
    contentDivs.forEach((div) => {
      this.resizeObserver!.observe(div);
    });

    // Also observe for new nodes being added
    const mutationObserver = new MutationObserver(() => {
      // Re-observe new content divs
      const newDivs = this.container.querySelectorAll('.node-foreign-object-div');
      newDivs.forEach((div) => {
        if (!this.isObserved(div)) {
          this.resizeObserver!.observe(div);
        }
      });
      this.debouncedSync();
    });

    mutationObserver.observe(this.container, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Check if an element is already being observed
   */
  private isObserved(element: Element): boolean {
    // Simple heuristic: check if we're already observing this element
    // ResizeObserver doesn't provide a way to check directly
    return element.hasAttribute('data-height-observed');
  }

  /**
   * Debounced sync to avoid excessive recalculations
   */
  private debouncedSync(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = window.setTimeout(() => {
      this.syncNodeHeights();
    }, this.config.resizeDebounce);
  }

  /**
   * Get the current unified height
   */
  getCurrentHeight(): number {
    return this.currentUnifiedHeight;
  }

  /**
   * Manually trigger a sync (useful after data changes)
   */
  triggerSync(): void {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.syncNodeHeights();
    });
  }

  /**
   * Clean up observers
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }
}

/**
 * Factory function for easy service creation
 */
export function createNodeHeightSync(
  container: HTMLElement | SVGElement,
  config?: NodeHeightSyncConfig
): NodeHeightSyncService {
  const service = new NodeHeightSyncService(container, config);
  service.init();
  return service;
}
