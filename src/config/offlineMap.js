/**
 * Offline map configuration — defaults to OpenStreetMap + Goldson Airport bounds.
 * Override any value via .env (see .env.example).
 */

import {
  DEFAULT_MAP_TILE_URL_TEMPLATE,
  GOLDSON_AIRPORT_BOUNDS
} from './offlineMapDefaults.js';

function parseNumber(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const offlineMapConfig = {
  tileUrlTemplate: import.meta.env.VITE_MAP_TILE_URL_TEMPLATE || DEFAULT_MAP_TILE_URL_TEMPLATE,
  styleUrl: import.meta.env.VITE_MAP_STYLE_URL || '',
  bounds: {
    north: parseNumber(import.meta.env.VITE_MAP_BOUNDS_NORTH, GOLDSON_AIRPORT_BOUNDS.north),
    south: parseNumber(import.meta.env.VITE_MAP_BOUNDS_SOUTH, GOLDSON_AIRPORT_BOUNDS.south),
    east: parseNumber(import.meta.env.VITE_MAP_BOUNDS_EAST, GOLDSON_AIRPORT_BOUNDS.east),
    west: parseNumber(import.meta.env.VITE_MAP_BOUNDS_WEST, GOLDSON_AIRPORT_BOUNDS.west)
  },
  minZoom: parseNumber(import.meta.env.VITE_MAP_MIN_ZOOM, 14),
  maxZoom: parseNumber(import.meta.env.VITE_MAP_MAX_ZOOM, 18)
};

export function isOfflineMapConfigured() {
  const { tileUrlTemplate, bounds } = offlineMapConfig;
  return Boolean(tileUrlTemplate) && Object.values(bounds).every((value) => Number.isFinite(value));
}

export function getOfflineMapConfigSummary() {
  if (isOfflineMapConfigured()) return null;
  return 'Offline map is not configured for this build.';
}
