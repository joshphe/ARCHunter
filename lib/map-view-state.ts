export const MAP_VIEW_KEY = 'arcwatch-map-view-v2';
export type MapViewState = {
  version: 2;
  zoom: number;
  centerX: number;
  centerY: number;
  selectedSlug: string | null;
  query: string;
  category: string;
  cap: string;
  collapsed: boolean;
};

export function readMapView(): MapViewState | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(MAP_VIEW_KEY) ?? 'null');
    if (!value || value.version !== 2 || !Number.isFinite(value.zoom) ||
      !Number.isFinite(value.centerX) || !Number.isFinite(value.centerY)) return null;
    return {
      version: 2, zoom: Math.max(.8,Math.min(3.2,value.zoom)), centerX: value.centerX, centerY: value.centerY,
      selectedSlug: typeof value.selectedSlug === 'string' ? value.selectedSlug : null,
      query: typeof value.query === 'string' ? value.query.slice(0,200) : '',
      category: typeof value.category === 'string' ? value.category : 'all',
      cap: ['all','unpriced','0','1','2','3','4'].includes(value.cap) ? value.cap : 'all',
      collapsed: typeof value.collapsed === 'boolean' ? value.collapsed : true,
    };
  } catch { return null; }
}

export function saveMapView(value: MapViewState) {
  try { sessionStorage.setItem(MAP_VIEW_KEY,JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
