import { isOfflineCapable } from './utils/platformCapabilities.js';

/**
 * Register the service worker only on browsers that pass offline capability checks.
 * Non-capable platforms (iOS, desktop, etc.) never attempt registration.
 */
export async function registerPwa() {
  if (!isOfflineCapable()) return;

  const { registerSW } = await import('virtual:pwa-register');
  registerSW({ immediate: true });
}
