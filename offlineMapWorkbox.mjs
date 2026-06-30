/**
 * Build-time Workbox runtime caching rules for map assets.
 */

import { DEFAULT_MAP_TILE_URL_REGEX } from './offlineMapDefaults.mjs';

function addRuntimeRule(rules, pattern, cacheName) {
  if (!pattern) return;

  try {
    rules.push({
      urlPattern: new RegExp(pattern),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName,
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    });
  } catch (error) {
    console.warn(`[PWA] Skipping map cache rule (${cacheName}): invalid regex (${error.message})`);
  }
}

export function getMapRuntimeCaching() {
  const rules = [];
  const tilePattern = process.env.VITE_MAP_TILE_URL_REGEX || DEFAULT_MAP_TILE_URL_REGEX;

  addRuntimeRule(rules, tilePattern, 'map-tiles');
  addRuntimeRule(rules, process.env.VITE_MAP_STYLE_URL_REGEX, 'map-styles');
  addRuntimeRule(rules, process.env.VITE_MAP_GLYPHS_URL_REGEX, 'map-glyphs');
  return rules;
}
