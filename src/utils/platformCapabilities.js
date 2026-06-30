/**
 * Feature-detection for offline/PWA capabilities.
 * No user-agent sniffing — gates offline mode to browsers that expose
 * the full required API stack (typically Android Chrome).
 */

function supportsServiceWorker() {
  return 'serviceWorker' in navigator;
}

function supportsCacheApi() {
  return 'caches' in window;
}

function supportsIndexedDb() {
  return 'indexedDB' in window;
}

function supportsBackgroundSync() {
  if ('SyncManager' in window) return true;
  if (typeof ServiceWorkerRegistration !== 'undefined') {
    return 'sync' in ServiceWorkerRegistration.prototype;
  }
  return false;
}

/** Individual capability flags (evaluated once at module load). */
export const platformCapabilities = {
  serviceWorker: supportsServiceWorker(),
  cacheApi: supportsCacheApi(),
  indexedDb: supportsIndexedDb(),
  backgroundSync: supportsBackgroundSync()
};

/**
 * True when all offline prerequisites are present.
 * iOS Safari, desktop browsers without Background Sync, etc. return false.
 */
export function isOfflineCapable() {
  const { serviceWorker, cacheApi, indexedDb, backgroundSync } = platformCapabilities;
  return serviceWorker && cacheApi && indexedDb && backgroundSync;
}
