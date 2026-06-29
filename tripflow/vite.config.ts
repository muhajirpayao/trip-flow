import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'TripFlow',
        short_name: 'TripFlow',
        description: 'Plan, track, and travel stress-free.',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/assets/vite.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/assets/vite.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Cache the app shell (JS/CSS/HTML/images) for instant loads + offline use
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        importScripts: ['push-sw.js'], // injects our push listener into the generated SW
        runtimeCaching: [
          {
            // Supabase REST calls — serve from cache instantly, refresh in background,
            // and fall back to cache entirely when offline.
            urlPattern: ({ url }) => url.hostname.endsWith('supabase.co'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'tripflow-api-cache',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true, 
      },
    }),
  ],
})