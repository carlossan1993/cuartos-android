import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

const button = (page: Page, es: boolean, spanish: string, english: string) => page.getByRole('button', { name: es ? spanish : english, exact: true })
async function savedJson(page: Page): Promise<string> {
  return page.evaluate(() => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, read = db.transaction('projects').objectStore('projects').getAll()
      read.onsuccess = () => { db.close(); resolve(read.result[0].json) }
      read.onerror = () => { db.close(); reject(read.error) }
    }
  }))
}
async function createRoom(page: Page, es: boolean, decorate = true) {
  await page.goto('/')
  await button(page, es, 'Crear un proyecto', 'Create a project').click()
  await page.locator('#projectName').fill('Volumen')
  await page.locator('#roomName').fill('Dormitorio')
  await button(page, es, 'Continuar', 'Continue').click()
  await page.locator('#width').fill('4.2'); await page.locator('#depth').fill('3.15')
  await button(page, es, 'Crear y guardar', 'Create and save').click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  if (!decorate) return
  await button(page, es, 'Añadir puerta', 'Add door').click()
  await button(page, es, 'Guardar abertura', 'Save opening').click()
  await expect(page.locator('.opening-form-panel')).toHaveCount(0)
  await button(page, es, 'Añadir ventana', 'Add window').click()
  await page.locator('#opening-wallId').selectOption({ index: 3 })
  await page.locator('#opening-offset').fill('0.6'); await page.locator('#opening-width').fill('1.2')
  await page.locator('#opening-height').fill('1.1'); await page.locator('#opening-sillHeight').fill('1')
  await button(page, es, 'Guardar abertura', 'Save opening').click()
  await expect(page.locator('.opening-form-panel')).toHaveCount(0)
  await button(page, es, 'Editar acabados', 'Edit finishes').click()
  await page.locator('.finish-presets button').filter({ hasText: es ? 'Roble' : 'Oak' }).click()
  await button(page, es, 'Guardar acabado', 'Save finish').click()
  await expect(page.locator('.finish-form')).toHaveCount(0)
  await button(page, es, 'Editar acabados', 'Edit finishes').click()
  await page.locator('#finish-surface').selectOption({ index: 2 })
  await page.locator('.finish-presets button').filter({ hasText: es ? 'Azul profundo' : 'Deep blue' }).click()
  await button(page, es, 'Guardar acabado', 'Save finish').click()
  await expect(page.locator('.finish-form')).toHaveCount(0)
  await button(page, es, 'Abrir catálogo', 'Open catalog').click()
  await button(page, es, 'Añadir mueble', 'Add furniture').click()
  await expect(page.locator('#furniture-catalog-title')).toHaveCount(0)
}
async function open3D(page: Page, es: boolean) {
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
}
async function bitmap(page: Page) { return createHash('sha256').update(await page.locator('.viewer-canvas canvas').screenshot()).digest('hex') }

test('lazy 3D render, materials, camera, cutaway, keyboard and round-trip preserve the saved model', async ({ page }, info) => {
  const es = info.project.name === 'phone', scripts: string[] = [], errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()) })
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await createRoom(page, es)
  expect(scripts.some(url => /Viewer3D-/.test(url))).toBe(false)
  const original = await savedJson(page)
  await open3D(page, es)
  expect(scripts.some(url => /Viewer3D-/.test(url))).toBe(true)
  await expect(page.locator('.viewer-room')).toContainText('13.23'.replace('.', es ? ',' : '.'))
  await expect(page.locator('.viewer-room')).toContainText(es ? '0,12 m' : '0.12 m')
  const density = await page.locator('.viewer-canvas canvas').evaluate((canvas: HTMLCanvasElement) => ({ actual: canvas.width / canvas.clientWidth, expected: Math.min(2, Math.max(1, devicePixelRatio)) }))
  expect(density.actual).toBeCloseTo(density.expected, 1)
  const image = await page.locator('.viewer-canvas canvas').screenshot()
  const wood = await page.evaluate(async base64 => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    for (let i = 0; i < rgba.length; i += 16) if (rgba[i] > rgba[i + 1] + 20 && rgba[i + 1] > rgba[i + 2] + 15) count++
    return count
  }, image.toString('base64'))
  expect(wood).toBeGreaterThan(50)
  const initial = await bitmap(page)
  await page.screenshot({ path: `test-results/viewer3d-${info.project.name}.png`, fullPage: true })
  await button(page, es, 'Acercar', 'Zoom in').click()
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await button(page, es, 'Encuadrar', 'Fit room').click()
  await expect.poll(() => bitmap(page)).toBe(initial)
  await button(page, es, 'Girar izquierda', 'Rotate left').click()
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await button(page, es, 'Desde arriba', 'Top view').click()
  const top = await bitmap(page)
  expect(top).not.toBe(initial)
  await page.getByRole('checkbox', { name: es ? 'Vista abierta' : 'Cutaway view', exact: true }).uncheck()
  await button(page, es, 'Encuadrar', 'Fit room').click()
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await page.locator('.viewer-canvas').screenshot({ path: `test-results/viewer3d-complete-${info.project.name}.png` })
  const region = page.locator('.viewer-canvas')
  await region.focus(); await region.press('ArrowRight'); await region.press('w'); await region.press('+'); await region.press('Home')
  await page.getByRole('checkbox', { name: es ? 'Vista abierta' : 'Cutaway view', exact: true }).check()
  await expect.poll(() => bitmap(page)).toBe(initial)
  // Native mouse orbit, wheel and right-drag pan, not synthetic button calls.
  await region.scrollIntoViewIfNeeded()
  let box = (await region.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 5 }); await page.mouse.up()
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await page.mouse.wheel(0, -90)
  box = (await region.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down({ button: 'right' })
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2, { steps: 3 }); await page.mouse.up({ button: 'right' })
  await button(page, es, 'Encuadrar', 'Fit room').click()
  await expect.poll(() => bitmap(page)).toBe(initial)
  await page.getByRole('combobox', { name: es ? 'Idioma' : 'Language', exact: true }).selectOption(es ? 'en' : 'es')
  await expect(button(page, !es, 'Desde arriba', 'Top view')).toBeVisible()
  expect(await savedJson(page)).toBe(original)
  await page.getByRole('button', { name: es ? /Back to 2D plan/ : /Volver al plano 2D/ }).click()
  await expect(page.locator('.furniture-list button')).toHaveCount(1)
  expect(await savedJson(page)).toBe(original)
  await open3D(page, !es)
  expect(await savedJson(page)).toBe(original)
  expect(errors).toEqual([])
})

test('touch camera, orientation, density and real context loss recover without writing data', async ({ page, context }, info) => {
  const es = info.project.name === 'phone'
  await createRoom(page, es, false)
  const original = await savedJson(page)
  await open3D(page, es)
  const region = page.locator('.viewer-canvas'), initial = await bitmap(page)
  await region.scrollIntoViewIfNeeded()
  const box = (await region.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2
  const client = await context.newCDPSession(page)
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number; id: number }[]) => { await client.send('Input.dispatchTouchEvent', { type, touchPoints: points }) }
  await touch('touchStart', [{ x, y, id: 1 }]); await touch('touchMove', [{ x: x + 35, y: y + 20, id: 1 }]); await touch('touchEnd', [])
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await button(page, es, 'Encuadrar', 'Fit room').click()
  await region.scrollIntoViewIfNeeded()
  const next = (await region.boundingBox())!, cx = next.x + next.width / 2, cy = next.y + next.height / 2
  await touch('touchStart', [{ x: cx - 25, y: cy, id: 1 }, { x: cx + 25, y: cy, id: 2 }])
  await touch('touchMove', [{ x: cx - 55, y: cy + 15, id: 1 }, { x: cx + 55, y: cy + 15, id: 2 }]); await touch('touchEnd', [])
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await page.setViewportSize(es ? { width: 844, height: 390 } : { width: 768, height: 1024 })
  await expect(region).toHaveAttribute('data-ready', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const viewport = page.viewportSize()!
  await client.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1.5, mobile: es })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await expect.poll(() => region.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width / canvas.clientWidth)).toBeCloseTo(1.5, 1)
  const extension = await region.locator('canvas').evaluate((canvas: HTMLCanvasElement) => { const gl = canvas.getContext('webgl2')!, extension = gl.getExtension('WEBGL_lose_context'); extension?.loseContext(); return !!extension })
  expect(extension).toBe(true)
  await expect(page.getByRole('alert')).toContainText(es ? 'se interrumpió' : 'was interrupted')
  expect(await savedJson(page)).toBe(original)
  await button(page, es, 'Reintentar', 'Try again').click()
  await expect(region).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  expect(await savedJson(page)).toBe(original)
  await client.detach()
})

test('unavailable WebGL shows translated recovery and can retry or return to 2D', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof get>) {
      if (String(args[0]).includes('webgl') && !sessionStorage.getItem('allow-webgl')) return null
      return get.apply(this, args)
    } as typeof get
  })
  await createRoom(page, es, false)
  const original = await savedJson(page)
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.getByRole('alert')).toContainText(es ? 'No pudimos mostrar' : 'could not display')
  expect(await savedJson(page)).toBe(original)
  await button(page, es, 'Volver al plano 2D', 'Back to 2D plan').click()
  await expect(page.locator('.canvas-surface canvas')).toBeVisible()
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.evaluate(() => sessionStorage.setItem('allow-webgl', 'yes'))
  await button(page, es, 'Reintentar', 'Try again').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  expect(await savedJson(page)).toBe(original)
})
