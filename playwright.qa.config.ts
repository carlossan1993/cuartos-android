import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config.ts'

export default defineConfig({
  ...base,
  testMatch: '**/qa-matrix.spec.ts',
  testIgnore: [],
  outputDir: 'test-results/qa-traces',
  reporter: [['list'], ['json', { outputFile: 'test-results/qa-matrix.json' }]],
  projects: ['phone', 'tablet'].flatMap(device => ['es', 'en'].flatMap(language => ['portrait', 'landscape'].map(orientation => {
    const portrait = device === 'phone' ? { width: 412, height: 839 } : { width: 768, height: 1024 }
    return {
      name: `${device}-${language}-${orientation}`,
      use: {
        ...(device === 'phone' ? devices['Pixel 7'] : devices['Desktop Chrome']),
        locale: language === 'es' ? 'es-EC' : 'en-US',
        viewport: orientation === 'portrait' ? portrait : { width: portrait.height, height: portrait.width },
      },
    }
  }))),
})
