// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout:   30_000,
  retries:   1,
  workers:   1,   // Séquentiel : les tests partagent IndexedDB entre runs
  reporter:  'list',

  use: {
    baseURL:    'http://localhost:8080',
    // Viewport mobile (iPhone 14 taille standard)
    viewport:   { width: 390, height: 844 },
    // Active le touch
    hasTouch:   true,
    // Captures en cas d'échec
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
  },

  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
  ],

  // Lance le serveur statique avant les tests (si pas déjà démarré)
  webServer: {
    command:        'python3 -m http.server 8080 --directory web',
    url:            'http://localhost:8080',
    reuseExistingServer: true,
    timeout:        15_000,
  },
});
