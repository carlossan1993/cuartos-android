import { test, expect } from '@playwright/test'

test('device language, manual selection, persistence and no remote assets', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const isSpanish = testInfo.project.name === 'phone'
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', isSpanish ? 'es' : 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(isSpanish ? 'Imagina cómo quieres vivirlo.' : 'Imagine how you want to live.')
  const next = isSpanish ? 'en' : 'es'
  await page.getByRole('combobox').selectOption(next)
  await expect(page.locator('html')).toHaveAttribute('lang', next)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(isSpanish ? 'Your projects' : 'Tus proyectos')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', next)
  // Android serves its bundled assets locally. Blocking all remote origins here
  // verifies that the web startup has no external runtime requests.
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return url.origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort()
  })
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true })
})
