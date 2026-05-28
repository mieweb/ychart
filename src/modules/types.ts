// Version constant - DO NOT REMOVE
declare const __YCHART_VERSION__: string;

export const YCHART_VERSION = __YCHART_VERSION__;

export interface YChartOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  childrenMargin?: number;
  compactMarginBetween?: number;
  compactMarginPair?: number;
  neighbourMargin?: number;
  editorTheme?: 'light' | 'dark';
  collapsible?: boolean;
  bgPatternStyle?: 'dotted' | 'dashed';
  patternColor?: string;
  toolbarPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'topcenter' | 'bottomcenter';
  toolbarOrientation?: 'horizontal' | 'vertical';
  experimental?: boolean;
  /** 
   * Set the initial Person of Interest (POI) when the chart loads.
   * Can be an id, name, email, or any field value that matches a person in the data.
   */
  self?: string | number;
  /**
   * Enable Shadow DOM encapsulation for CSS isolation.
   * When true, YChart renders inside a Shadow DOM to prevent style conflicts with the host page.
   * Default: false
   */
  useShadowDOM?: boolean;
}

export interface FieldSchema {
  type: string;
  required: boolean;
  missing: boolean;
  aliases?: string[];  // Alternate field names that map to this field
}

export interface SchemaDefinition {
  [fieldName: string]: FieldSchema;
}

export interface CardElement {
  [tagName: string]: string | CardConfig;
}

export interface CardConfig {
  class?: string;
  content?: string;
  style?: string;
  children?: CardElement[];
}

export interface FrontMatter {
  options: YChartOptions;
  schema: SchemaDefinition;
  card?: CardElement[];
  data: string;
}

export interface NodeCoordinates {
  id: string | number;
  x: number;
  y: number;
  width: number;
  height: number;
}
