import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/qa-matrix.spec.ts',
  outputDir: 'test-results/traces',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/regression.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], locale: 'es-EC' } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, locale: 'en-US' } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
