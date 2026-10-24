import { expect, test } from '@playwright/test'
import { button, createDesign, saved } from './support/qa-flow.ts'

test('privacy works offline in ES/EN, traps focus and leaves confirmed data intact', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/')
  const original = await createDesign(page, es, 'rectangle', 'Privacidad')
  await page.getByRole('button', { name: es ? /Volver al resumen/ : /Back to summary/ }).click()
  await page.getByRole('button', { name: es ? /Volver a tus proyectos/ : /Back to your projects/ }).click()
  const open = button(page, es, 'Política de privacidad', 'Privacy policy')
  await open.click()
  const dialog = page.getByRole('dialog')
  await expect(page.locator('#privacy-title')).toBeFocused()
  await expect(dialog).toContainText(es ? 'No existe una copia en nuestros servidores' : 'There is no copy on our servers')
  await expect(dialog).toContainText('csdigital.apps@gmail.com')
  await expect(dialog).not.toContainText(/carlos|sandoval|github/i)
  await expect(dialog.locator('a')).toHaveAttribute('href', 'mailto:csdigital.apps@gmail.com')
  await dialog.locator('#panel-language').selectOption(es ? 'en' : 'es')
  await expect(page.locator('#privacy-title')).toHaveText(es ? 'Privacy policy' : 'Política de privacidad')
  await dialog.locator('#panel-language').selectOption(es ? 'es' : 'en')
  await dialog.locator('a').focus(); await page.keyboard.press('Tab')
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await page.screenshot({ path: `test-results/privacy-${info.project.name}.png` })
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(open).toBeFocused()
  expect(await saved(page, 'Privacidad')).toEqual(original)
  for (const lang of ['es', 'en']) {
    const response = await page.goto('/privacy/' + lang + '.html')
    expect(response?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    await expect(page.locator('h1')).toHaveText(lang === 'es' ? 'Cuartos · Política de privacidad' : 'Cuartos · Privacy policy')
    await expect(page.locator('section')).toHaveCount(7)
    await expect(page.locator('body')).not.toContainText(/carlos|sandoval|github/i)
    await expect(page.getByRole('link', { name: 'csdigital.apps@gmail.com' })).toHaveAttribute('href', 'mailto:csdigital.apps@gmail.com')
    expect(await page.locator('script, iframe, img').count()).toBe(0)
  }
})
