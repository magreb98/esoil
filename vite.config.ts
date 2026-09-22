import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'eSoil — Évaluation des terres FAO',
        short_name: 'eSoil',
        description: "Moteur d'évaluation des terres FAO (méthode Sys / Beernaert & Bitondo), hors ligne.",
        theme_color: '#134E3A',
        background_color: '#FDFBF7',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'fr',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        // Les modules d'export (Excel/Word/PDF, §5) sont chargés à la demande (dynamic
        // import) mais doivent rester précachés pour fonctionner hors ligne — pdfmake
        // embarque ses polices en base64 et dépasse la limite par défaut de 2 Mio.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // tests/e2e utilise @playwright/test (npm run test:e2e), pas vitest.
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
})
