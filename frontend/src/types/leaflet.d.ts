// Minimal TypeScript declarations for the subset of Leaflet used by this app

declare module "leaflet" {
  export type LatLngTuple = [number, number];

  export interface PolylineStyle {
    color?: string;
    weight?: number;
    opacity?: number;
    smoothFactor?: number;
    lineCap?: "butt" | "round" | "square";
    lineJoin?: "miter" | "round" | "bevel";
    interactive?: boolean;
    bubblingMouseEvents?: boolean;
    cursor?: string;
  }

  export interface Layer {
    addTo(target: Map | LayerGroup): this;
    on(type: string, handler: (event?: unknown) => void): void;
    readonly options: PolylineStyle;
    setStyle?(style: PolylineStyle): this;
    eachLayer?(callback: (layer: Layer) => void): this;
  }

  export type Polyline = Layer;

  export type Marker = Layer;

  export type TileLayer = Layer;

  export interface LayerGroup extends Layer {
    eachLayer(callback: (layer: Layer) => void): this;
  }

  export type LatLngBounds = object;

  export class Map {
    remove(): void;
    zoomIn(): void;
    zoomOut(): void;
    flyTo(latlng: LatLngTuple, zoom?: number, options?: { duration?: number }): this;
    fitBounds(bounds: LatLngBounds, options?: { padding?: [number, number] }): void;
    addLayer(layer: Layer): this;
    removeLayer(layer: unknown): this;
  }

  export type DivIcon = object;

  export interface DivIconOptions {
    html?: string;
    className?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    interactive?: boolean;
  }

  export interface MapOptions {
    center?: LatLngTuple;
    zoom?: number;
    zoomControl?: boolean;
  }

  export interface TileLayerOptions {
    attribution?: string;
    maxZoom?: number;
  }

  export interface MarkerOptions {
    icon?: DivIcon;
  }

  export function map(element: HTMLElement, options?: MapOptions): Map;

  export function tileLayer(url: string, options?: TileLayerOptions): TileLayer;

  export function polyline(latlngs: LatLngTuple[], options?: PolylineStyle): Polyline;

  export function divIcon(options?: DivIconOptions): DivIcon;

  export function marker(latlng: LatLngTuple, options?: MarkerOptions): Marker;

  export function latLngBounds(latLngs: LatLngTuple[]): LatLngBounds;

  export function layerGroup(layers?: Layer[]): LayerGroup;

  export type Control = Layer;

  export const Control: {
    extend(proto: {
      options?: { position?: string };
      onAdd?: () => HTMLElement;
    }): new () => Control;
  };

  export const Icon: {
    Default: {
      mergeOptions(options: Record<string, string>): void;
    };
  };

  export const DomUtil: {
    create(tagName: string, className?: string, container?: HTMLElement): HTMLElement;
  };

  export const DomEvent: {
    disableClickPropagation(el: HTMLElement): void;
    disableScrollPropagation(el: HTMLElement): void;
  };

  const L: {
    map: typeof map;
    tileLayer: typeof tileLayer;
    polyline: typeof polyline;
    divIcon: typeof divIcon;
    marker: typeof marker;
    latLngBounds: typeof latLngBounds;
    layerGroup: typeof layerGroup;
    Icon: typeof Icon;
    Control: typeof Control;
    DomUtil: typeof DomUtil;
    DomEvent: typeof DomEvent;
  };

  export default L;
}
