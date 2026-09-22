import { defineConfig, devices } from '@playwright/test';

/**
 * Config e2e — le test principal (offline.spec.ts) construit la version de production et la
 * sert localement (§ Étape 4 : test réel hors ligne, priorité haute). `webServer` construit
 * puis lance `vite preview`, qui sert exactement les fichiers de `dist/` (précache PWA
 * compris), contrairement au serveur de dev qui réécrit les modules à la volée.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'android-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
