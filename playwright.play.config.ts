import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: '**/play-assets.spec.ts', outputDir: 'test-results/play-traces',
  workers: 1, retries: 0, reporter: [['list'], ['json', { outputFile: 'play-output/capture-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  projects: [
    { name: 'phone-es', use: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'es-EC' } },
    { name: 'phone-en', use: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'en-US' } },
    { name: 'tablet-es', use: { viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1.5, hasTouch: true, locale: 'es-EC' } },
    { name: 'tablet-en', use: { viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1.5, hasTouch: true, locale: 'en-US' } },
  ],
  webServer: { command: 'npm run preview -- --host 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
})
