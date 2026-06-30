import { offlineMapConfig } from '../config/offlineMap.js';

function lonToTileX(longitude, zoom) {
  return Math.floor(((longitude + 180) / 360) * (2 ** zoom));
}

function latToTileY(latitude, zoom) {
  const radians = (latitude * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * (2 ** zoom)
  );
}

function buildTileUrl(template, zoom, x, y) {
  return template
    .replaceAll('{z}', String(zoom))
    .replaceAll('{x}', String(x))
    .replaceAll('{y}', String(y));
}

export function collectTileUrlsForBounds(config = offlineMapConfig) {
  const { tileUrlTemplate, bounds, minZoom, maxZoom } = config;
  const urls = new Set();

  for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
    const minX = lonToTileX(bounds.west, zoom);
    const maxX = lonToTileX(bounds.east, zoom);
    const minY = latToTileY(bounds.north, zoom);
    const maxY = latToTileY(bounds.south, zoom);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        urls.add(buildTileUrl(tileUrlTemplate, zoom, x, y));
      }
    }
  }

  return [...urls];
}

export async function cacheUrlsInServiceWorker(urls, { batchSize = 40, onProgress } = {}) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not available in this browser.');
  }

  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) {
    throw new Error('Service worker is not active yet.');
  }

  let cachedCount = 0;
  for (let index = 0; index < urls.length; index += batchSize) {
    const batch = urls.slice(index, index + batchSize);
    worker.postMessage({
      type: 'CACHE_URLS',
      payload: { urlsToCache: batch }
    });
    cachedCount += batch.length;
    onProgress?.({ cachedCount, totalCount: urls.length });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return cachedCount;
}

export async function downloadOfflineMapTiles({ onProgress } = {}) {
  const urls = collectTileUrlsForBounds();
  if (!urls.length) {
    throw new Error('No map tiles to cache for the configured bounds.');
  }

  if (offlineMapConfig.styleUrl) {
    urls.unshift(offlineMapConfig.styleUrl);
  }

  await cacheUrlsInServiceWorker(urls, { onProgress });
  return urls.length;
}
