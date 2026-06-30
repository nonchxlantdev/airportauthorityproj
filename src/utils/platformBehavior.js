import { isOfflineCapable } from './platformCapabilities.js';

/**
 * Non-Android / non-capable browsers: stay a normal connected web app.
 * Suppress PWA install prompts; service worker registration happens separately.
 */
export function initializeNonCapablePlatformBehavior() {
  if (isOfflineCapable()) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
  });
}
