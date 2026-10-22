import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page, spanish: boolean) {
  await page.goto('/')
  await page.getByRole('button', { name: spanish ? 'Crear un proyecto' : 'Create a project', exact: true }).click()
  await page.getByLabel(spanish ? 'Nombre del proyecto' : 'Project name').fill('Mi habitación')
  await page.getByLabel(spanish ? 'Nombre de la habitación' : 'Room name').fill('Dormitorio')
  await page.getByRole('button', { name: spanish ? 'Continuar' : 'Continue', exact: true }).click()
  await page.locator('#width').fill('4.2')
  await page.locator('#depth').fill('3.15')
  await page.getByRole('button', { name: spanish ? 'Crear y guardar' : 'Create and save', exact: true }).click()
  await page.getByRole('button', { name: spanish ? 'Abrir plano 2D' : 'Open 2D plan', exact: true }).click()
  await expect(page.locator('.canvas-surface canvas')).toBeVisible()
}

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

const bitmap = (page: Page) => page.locator('.canvas-surface canvas').evaluate((canvas: HTMLCanvasElement) => {
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  let hash = 2166136261
  for (let i = 0; i < pixels.length; i += 4) hash = Math.imul(hash ^ (pixels[i] + (pixels[i + 1] << 8) + (pixels[i + 2] << 16)), 16777619)
  return (hash >>> 0).toString(16)
})

test('select, pan, zoom, fit, keyboard and grid without changing saved geometry', async ({ page, context }, testInfo) => {
  const spanish = testInfo.project.name === 'phone'
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await openEditor(page, spanish)
  const original = await savedJson(page)
  const surface = page.getByRole('region', { name: spanish ? 'Plano 2D interactivo' : 'Interactive 2D plan', exact: true })
  const zoom = page.getByLabel(spanish ? 'Nivel de zoom' : 'Zoom level', { exact: true })
  const room = page.getByRole('button', { name: 'Dormitorio', exact: true })
  await expect(zoom).toHaveText('100%')
  const ratio = await page.locator('.canvas-surface canvas').evaluate((canvas: HTMLCanvasElement) => ({ actual: canvas.width / parseFloat(canvas.style.width), expected: Math.min(3, Math.max(1, devicePixelRatio)) }))
  expect(ratio.actual).toBeCloseTo(ratio.expected, 2)
  await surface.click()
  await expect(room).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.selected-measures')).toContainText(spanish ? '4,2 m' : '4.2 m')
  await expect(page.locator('.selected-measures')).toContainText(spanish ? '13,23 m²' : '13.23 m²')
  await surface.click({ position: { x: 12, y: 12 } })
  await expect(room).toHaveAttribute('aria-pressed', 'false')
  const initial = await bitmap(page)
  await surface.scrollIntoViewIfNeeded()
  const box = (await surface.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 + 30, { steps: 6 })
  await page.mouse.up()
  await expect(room).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await expect(zoom).toHaveText('100%')
  await page.getByRole('button', { name: spanish ? 'Encuadrar' : 'Fit room', exact: true }).click()
  await expect.poll(() => bitmap(page)).toBe(initial)
  await page.getByRole('button', { name: spanish ? 'Acercar' : 'Zoom in', exact: true }).click()
  await expect(zoom).toHaveText('125%')
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await page.getByRole('button', { name: spanish ? 'Alejar' : 'Zoom out', exact: true }).click()
  await expect(zoom).toHaveText('100%')
  await surface.hover()
  await page.mouse.wheel(0, -180)
  await expect.poll(() => zoom.textContent()).not.toBe('100%')
  await surface.focus()
  await surface.press('0')
  await expect(zoom).toHaveText('100%')
  await surface.press('Enter')
  await expect(room).toHaveAttribute('aria-pressed', 'true')
  await surface.press('Escape')
  await expect(room).toHaveAttribute('aria-pressed', 'false')
  await surface.press('ArrowRight')
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await surface.press('Home')
  await expect.poll(() => bitmap(page)).toBe(initial)
  const grid = page.getByRole('checkbox', { name: spanish ? 'Cuadrícula' : 'Grid', exact: true })
  await grid.uncheck()
  await expect(page.getByText(spanish ? 'Cuadrícula oculta' : 'Grid hidden', { exact: true })).toBeVisible()
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await grid.check()
  await room.click()
  await page.screenshot({ path: `test-results/editor-${testInfo.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('combobox').selectOption(spanish ? 'en' : 'es')
  await expect(page.getByRole('button', { name: spanish ? 'Fit room' : 'Encuadrar', exact: true })).toBeVisible()
  expect(await savedJson(page)).toBe(original)
  await page.getByRole('button', { name: spanish ? 'Back to summary' : 'Volver al resumen' }).click()
  await page.getByRole('button', { name: spanish ? 'Back to your projects' : 'Volver a tus proyectos' }).click()
  const reopened = await context.newPage()
  await page.close()
  await reopened.goto('/')
  await reopened.getByRole('button', { name: /Mi habitación/ }).click()
  await reopened.getByRole('button', { name: spanish ? 'Open 2D plan' : 'Abrir plano 2D', exact: true }).click()
  await expect(reopened.locator('.canvas-surface canvas')).toBeVisible()
  expect(await savedJson(reopened)).toBe(original)
  expect(errors).toEqual([])
})

test('touch tap, drag, pinch, cancellation and orientation changes', async ({ page, context }, testInfo) => {
  const spanish = testInfo.project.name === 'phone'
  await openEditor(page, spanish)
  const original = await savedJson(page)
  const surface = page.locator('.canvas-surface')
  await surface.scrollIntoViewIfNeeded()
  const client = await context.newCDPSession(page)
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  async function center() {
    await surface.scrollIntoViewIfNeeded()
    const box = (await surface.boundingBox())!
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }
  let { x, y } = await center()
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: { x: number; y: number; id: number }[]) => { await client.send('Input.dispatchTouchEvent', { type, touchPoints: points }) }
  const room = page.getByRole('button', { name: 'Dormitorio', exact: true })
  await touch('touchStart', [{ x, y, id: 1 }]); await touch('touchEnd', [])
  await expect(room).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: spanish ? 'Quitar selección' : 'Clear selection', exact: true }).click()
  ;({ x, y } = await center())
  const initial = await bitmap(page)
  await touch('touchStart', [{ x, y, id: 1 }])
  await touch('touchMove', [{ x: x + 35, y: y + 20, id: 1 }]); await touch('touchEnd', [])
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  await expect(room).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: spanish ? 'Encuadrar' : 'Fit room', exact: true }).click()
  ;({ x, y } = await center())
  await touch('touchStart', [{ x: x - 30, y, id: 1 }, { x: x + 30, y, id: 2 }])
  await touch('touchMove', [{ x: x - 65, y: y + 12, id: 1 }, { x: x + 65, y: y + 12, id: 2 }])
  await touch('touchEnd', [])
  const zoom = page.getByLabel(spanish ? 'Nivel de zoom' : 'Zoom level', { exact: true })
  await expect.poll(async () => parseInt((await zoom.textContent())!)).toBeGreaterThan(180)
  await expect(room).toHaveAttribute('aria-pressed', 'false')
  await touch('touchStart', [{ x, y, id: 1 }]); await touch('touchCancel', [])
  await expect(room).toHaveAttribute('aria-pressed', 'false')
  const beforeResize = await zoom.textContent()
  await page.setViewportSize(spanish ? { width: 844, height: 390 } : { width: 768, height: 1024 })
  await expect(zoom).toHaveText(beforeResize!)
  await expect(surface.locator('canvas')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: spanish ? 'Encuadrar' : 'Fit room', exact: true }).click()
  await expect(zoom).toHaveText('100%')
  await room.click()
  await page.screenshot({ path: `test-results/editor-rotated-${testInfo.project.name}.png`, fullPage: true })
  const viewport = page.viewportSize()!
  await client.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 2, mobile: spanish })
  await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(2)
  // CDP changes the reported density without a native window notification.
  // Deliver the resize notification that the renderer listens for.
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await expect.poll(() => surface.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width / parseFloat(canvas.style.width))).toBeCloseTo(2, 2)
  expect(await savedJson(page)).toBe(original)
  await client.detach()
})
