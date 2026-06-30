/**
 * Build-time Workbox runtime caching rules for map assets.
 * Patterns come from .env regexes — no provider hardcoded.
 */

function addRuntimeRule(rules, envKey, cacheName) {
  const pattern = process.env[envKey];
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
    console.warn(`[PWA] Skipping ${envKey}: invalid regex (${error.message})`);
  }
}

export function getMapRuntimeCaching() {
  const rules = [];
  addRuntimeRule(rules, 'VITE_MAP_TILE_URL_REGEX', 'map-tiles');
  addRuntimeRule(rules, 'VITE_MAP_STYLE_URL_REGEX', 'map-styles');
  addRuntimeRule(rules, 'VITE_MAP_GLYPHS_URL_REGEX', 'map-glyphs');
  return rules;
}
