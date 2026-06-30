/**
 * Offline map configuration — supply via .env (see .env.example).
 * No tile provider is assumed; download + SW caching stay disabled until configured.
 */

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const offlineMapConfig = {
  tileUrlTemplate: import.meta.env.VITE_MAP_TILE_URL_TEMPLATE || '',
  styleUrl: import.meta.env.VITE_MAP_STYLE_URL || '',
  bounds: {
    north: parseNumber(import.meta.env.VITE_MAP_BOUNDS_NORTH),
    south: parseNumber(import.meta.env.VITE_MAP_BOUNDS_SOUTH),
    east: parseNumber(import.meta.env.VITE_MAP_BOUNDS_EAST),
    west: parseNumber(import.meta.env.VITE_MAP_BOUNDS_WEST)
  },
  minZoom: parseNumber(import.meta.env.VITE_MAP_MIN_ZOOM) ?? 14,
  maxZoom: parseNumber(import.meta.env.VITE_MAP_MAX_ZOOM) ?? 18
};

export function isOfflineMapConfigured() {
  const { tileUrlTemplate, bounds } = offlineMapConfig;
  return Boolean(tileUrlTemplate) && Object.values(bounds).every((value) => value !== null);
}

export function getOfflineMapConfigSummary() {
  if (isOfflineMapConfigured()) return null;
  return 'Set VITE_MAP_TILE_URL_TEMPLATE and VITE_MAP_BOUNDS_* in .env to enable offline map download.';
}
