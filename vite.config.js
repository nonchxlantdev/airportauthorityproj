import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { getMapRuntimeCaching } from './offlineMapWorkbox.mjs';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'Belize Airport Operations',
        short_name: 'BAC Ops',
        description: 'Job and task management for Philip S. W. Goldson International Airport',
        theme_color: '#004ca8',
        background_color: '#f5f8fb',
        display: 'standalone',
        orientation: 'landscape',
        scope: '/airportauthorityproj/',
        start_url: '/airportauthorityproj/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        importScripts: ['offline-sync-sw.js'],
        runtimeCaching: getMapRuntimeCaching()
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  base: '/airportauthorityproj/'
});
