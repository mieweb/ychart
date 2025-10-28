declare module 'd3-org-chart' {
  export class OrgChart {
    constructor();
    container(selector: string | HTMLElement): this;
    data(data: any[]): this;
    nodeWidth(width: number | ((d: any) => number)): this;
    nodeHeight(height: number | ((d: any) => number)): this;
    childrenMargin(margin: number | ((d: any) => number)): this;
    compactMarginBetween(margin: number | ((d: any) => number)): this;
    compactMarginPair(margin: number | ((d: any) => number)): this;
    neighbourMargin(margin: number | ((a: any, b: any) => number)): this;
    siblingsMargin(margin: number | ((d: any) => number)): this;
    nodeContent(content: string | ((d: any, i: number, arr: any[], state: any) => string)): this;
    layout(layout: 'top' | 'bottom' | 'left' | 'right'): this;
    render(): this;
    fit(): this;
    expandAll(): this;
    collapseAll(): this;
    exportSvg(): void;
    exportImg(options?: { full?: boolean; save?: boolean; onLoad?: (base64: string) => void }): void;
    zoomIn(): this;
    zoomOut(): this;
    fullscreen(): this;
    setCentered(nodeId: string): this;
    setHighlighted(nodeId: string): this;
    setUpToTheRootHighlighted(nodeId: string): this;
    clearHighlighting(): this;
    setExpanded(nodeId: string, expanded?: boolean): this;
    addNode(node: any): this;
    removeNode(nodeId: string): this;
    onNodeClick(callback: (d: any) => void): this;
    linkUpdate(callback: (d: any, i: number, arr: any[]) => void): this;
    nodeUpdate(callback: (d: any, i: number, arr: any[]) => void): this;
    buttonContent(content: string | ((d: any) => string)): this;
    layoutBindings(bindings?: any): any;
    getChartState(): any;
  }
}
