import { expect, test } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { button, createDesign, design, saved } from './support/qa-flow.ts'

test('capture actual product UI and store graphics', async ({ page, context }, info) => {
  test.setTimeout(120000)
  const es = info.project.name.endsWith('-es'), lang = es ? 'es-419' : 'en-US'
  const folder = 'play-output/screenshots/' + lang + '/' + (info.project.name.startsWith('phone') ? 'phone' : 'tablet')
  await mkdir(folder, { recursive: true }); await mkdir('play-output/graphics', { recursive: true })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/')
  const name = es ? 'Mi espacio' : 'My space'
  await createDesign(page, es, 'rectangle', name)
  // Enrich the example using public controls only; nothing is patched into the app or storage.
  await button(page, es, 'Editar acabados', 'Edit finishes').click()
  await page.locator('.finish-presets button').filter({ hasText: es ? 'Roble' : 'Oak' }).click()
  await button(page, es, 'Guardar acabado', 'Save finish').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await button(page, es, 'Editar acabados', 'Edit finishes').click()
  await page.locator('#finish-surface').selectOption({ index: 2 })
  await page.locator('.finish-presets').getByRole('button', { name: es ? 'Azul profundo' : 'Deep blue', exact: true }).click()
  await button(page, es, 'Guardar acabado', 'Save finish').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('checkbox', { name: es ? /^Ajuste:/ : /^Snap:/ }).uncheck()
  async function position(x: string, y: string) {
    await button(page, es, 'Editar posición', 'Edit position').click()
    await page.locator('#furniture-x').fill(x); await page.locator('#furniture-y').fill(y)
    await button(page, es, 'Guardar posición', 'Save position').click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  // Finishes clear the active furniture selection; select the existing chair again.
  await page.locator('.furniture-list button').first().click()
  await position('3.6', '1.2')
  for (const item of [{ index: 0, x: '.8', y: '2.7' }, { index: 2, x: '3.6', y: '3' }, { index: 6, x: '3.6', y: '.55' }]) {
    await button(page, es, 'Abrir catálogo', 'Open catalog').click()
    await page.locator('.furniture-catalog-card').nth(item.index).click()
    await button(page, es, 'Añadir mueble', 'Add furniture').click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await position(item.x, item.y)
  }
  const confirmed = await saved(page, name)
  expect(confirmed.furniture).toHaveLength(4)
  await page.locator('.canvas-surface').scrollIntoViewIfNeeded()
  await page.screenshot({ path: folder + '/01-plan.png' })
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 30000 })
  await page.locator('.viewer-canvas').scrollIntoViewIfNeeded()
  await page.screenshot({ path: folder + '/02-3d.png' })
  const roomImage = await page.locator('.viewer-canvas canvas').screenshot()
  expect(design(await saved(page, name))).toEqual(design(confirmed))
  await page.getByRole('button', { name: es ? /Volver al plano 2D/ : /Back to 2D plan/ }).click()
  await button(page, es, 'Abrir catálogo', 'Open catalog').click()
  await expect(page.locator('.furniture-catalog-card')).toHaveCount(16)
  await page.screenshot({ path: folder + '/03-catalog.png' })
  await page.getByRole('button', { name: es ? 'Cerrar panel' : 'Close panel', exact: true }).click()
  await page.getByRole('button', { name: es ? /Volver al resumen/ : /Back to summary/ }).click()
  await page.locator('.summary-heading').scrollIntoViewIfNeeded()
  await page.screenshot({ path: folder + '/04-project.png' })
  expect(await saved(page, name)).toEqual(confirmed)
  expect(errors).toEqual([])
  if (info.project.name.startsWith('tablet')) {
    const graphic = await context.newPage()
    await graphic.setViewportSize({ width: 1024, height: 500 })
    await graphic.setContent(`<html><head><style>*{box-sizing:border-box}body{margin:0;background:#03038c;color:#f6f5f0;font-family:Arial,sans-serif;width:1024px;height:500px;display:flex;align-items:center;padding:64px;gap:30px}.copy{width:440px}h1{font-size:76px;letter-spacing:-3px;margin:0 0 22px}p{font-size:29px;line-height:1.35;margin:0 0 24px}.small{font-size:18px;color:#dbc7a7}img{width:420px;height:330px;object-fit:contain;background:#f6f5f0;border:12px solid #f6f5f0;border-radius:20px}</style></head><body><div class="copy"><h1>Cuartos.</h1><p>${es ? 'Dale espacio<br>a tus ideas.' : 'Make room<br>for your ideas.'}</p><p class="small">${es ? 'Diseño 2D y 3D · Sin conexión' : '2D and 3D design · Offline'}</p></div><img alt="" src="data:image/png;base64,${roomImage.toString('base64')}"></body></html>`)
    await graphic.evaluate(() => Promise.all([...document.images].map(image => image.decode())))
    await graphic.screenshot({ path: 'play-output/graphics/feature-' + lang + '.png', scale: 'css' })
    await graphic.close()
  }
  if (info.project.name === 'phone-es') {
    const iconPage = await context.newPage()
    await iconPage.setViewportSize({ width: 512, height: 512 })
    const source = (await readFile('public/icon.svg', 'utf8')).replace('rx="18"', '').replace('<svg ', '<svg width="512" height="512" ')
    await iconPage.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#03038c">' + source + '</body></html>')
    await iconPage.screenshot({ path: 'play-output/graphics/icon-512.png', scale: 'css' })
    await iconPage.close()
  }
  await writeFile(folder + '/provenance.json', JSON.stringify({ commit: process.env.GITHUB_SHA ?? null, profile: info.project.name, language: lang, viewport: info.project.use.viewport, dpr: info.project.use.deviceScaleFactor, source: 'actual application in Chromium emulation; not a physical Android capture', files: ['01-plan.png', '02-3d.png', '03-catalog.png', '04-project.png'], seeded: false, pageErrors: errors }, null, 2))
})
