import { expect, test, type Locator, type Page } from '@playwright/test'
import type { Project } from '../src/domain/types.ts'
import { button, records } from './support/qa-flow.ts'

const controls = (page: Page) => page.locator('.furniture-rotation')
const turnRight = (page: Page, es: boolean) => button(page, es, 'Girar 90° a la derecha', 'Rotate 90° clockwise')
const turnLeft = (page: Page, es: boolean) => button(page, es, 'Girar 90° a la izquierda', 'Rotate 90° counterclockwise')
async function activate(locator: Locator, touch: boolean) { if (touch) await locator.tap(); else await locator.click() }
async function json(page: Page) { return (await records(page))[0].json }
async function saved(page: Page): Promise<Project> { return JSON.parse(await json(page)) }
async function tapWorld(page: Page, es: boolean, x: number, y: number) {
  const surface = page.locator('.canvas-surface'); await surface.scrollIntoViewIfNeeded()
  const box = (await surface.boundingBox())!, w = Math.round(box.width), h = Math.round(box.height)
  const pad = Math.min(64, w * .18, h * .18), scale = Math.min((w - pad * 2) / 4, (h - pad * 2) / 3)
  const point = { x: box.x + w / 2 + (x - 2) * scale, y: box.y + h / 2 + (y - 1.5) * scale }
  if (es) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y)
}
async function start(page: Page, es: boolean) {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && sessionStorage.getItem('deny-put')) throw new DOMException('Full', 'QuotaExceededError')
      return put.apply(this, args)
    }
  })
  await page.goto('/')
  await button(page, es, 'Crear un proyecto', 'Create a project').click()
  await page.locator('#projectName').fill('Giro junto a pared'); await page.locator('#roomName').fill('Sala')
  await button(page, es, 'Continuar', 'Continue').click()
  await page.locator('#width').fill('4'); await page.locator('#depth').fill('3')
  await button(page, es, 'Crear y guardar', 'Create and save').click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await expect(page.locator('.canvas-surface canvas')).toBeVisible()
  await button(page, es, 'Abrir catálogo', 'Open catalog').click()
  await page.locator('.furniture-catalog-card').nth(2).click()
  await button(page, es, 'Añadir mueble', 'Add furniture').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await button(page, es, 'Editar posición', 'Edit position').click()
  await page.locator('#furniture-x').fill('3.5'); await page.locator('#furniture-y').fill('1.5'); await page.locator('#furniture-rotation').fill('90')
  await button(page, es, 'Guardar posición', 'Save position').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await button(page, es, 'Abrir catálogo', 'Open catalog').click()
  await page.locator('.furniture-catalog-card').nth(4).click()
  await button(page, es, 'Añadir mueble', 'Add furniture').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await button(page, es, 'Encuadrar', 'Fit room').click()
  await tapWorld(page, es, 3.5, 1.5)
  await expect(controls(page)).toHaveAttribute('data-rotation', '90')
}

test('wall-crossing preview completes 180 degrees in both directions, saves once and undoes once', async ({ page }, info) => {
  const es = info.project.name === 'phone', errors: string[] = []
  page.on('pageerror', e => errors.push(e.message)); await start(page, es)
  const original = await json(page)
  await activate(turnRight(page, es), es)
  await expect(controls(page)).toHaveAttribute('data-invalid', 'true')
  expect(await json(page)).toBe(original)
  await page.locator('.canvas-frame').screenshot({ path: `test-results/rotation-intermediate-${info.project.name}.png` })
  await activate(turnRight(page, es), es)
  await expect(controls(page)).toHaveAttribute('data-rotation', '270')
  await expect(controls(page)).toHaveAttribute('data-invalid', 'false')
  expect(await json(page)).toBe(original)
  await page.locator('.canvas-frame').screenshot({ path: `test-results/rotation-final-${info.project.name}.png` })
  await tapWorld(page, es, 2, 1.5)
  await expect(controls(page)).toHaveAttribute('data-rotation', '0')
  await expect(page.locator('.furniture-list button').nth(1)).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await saved(page)).furniture[0].rotation).toBe(270)
  const confirmed = await saved(page), initial: Project = JSON.parse(original)
  expect({ ...confirmed, updatedAt: initial.updatedAt, furniture: initial.furniture }).toEqual(initial)
  await button(page, es, 'Deshacer', 'Undo').click()
  await expect.poll(async () => (await saved(page)).furniture[0].rotation).toBe(90)
  // Undo updates the timestamp, so take the exact current JSON for the next run.
  await tapWorld(page, es, 3.5, 1.5)
  const beforeLeft = await json(page)
  await activate(turnLeft(page, es), es); await activate(turnLeft(page, es), es)
  expect(await json(page)).toBe(beforeLeft)
  await tapWorld(page, es, .5, .5)
  await expect(controls(page)).toHaveCount(0)
  await expect.poll(async () => (await saved(page)).furniture[0].rotation).toBe(270)
  const reopenedJson = await json(page)
  await page.reload(); await page.getByRole('button', { name: /Giro junto a pared/ }).click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  expect(await json(page)).toBe(reopenedJson); expect(errors).toEqual([])
})

test('invalid final angle rolls back, full turn is a no-op and Escape/blur/orientation discard preview', async ({ page }, info) => {
  const es = info.project.name === 'phone'; await start(page, es)
  const original = await json(page)
  await activate(turnRight(page, es), es); await tapWorld(page, es, .5, .5)
  await expect(controls(page)).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText(es ? 'orientación inicial' : 'original orientation')
  expect(await json(page)).toBe(original)
  await tapWorld(page, es, 3.5, 1.5)
  for (const angle of [180, 270, 0, 90]) {
    await activate(turnRight(page, es), es); await expect(controls(page)).toHaveAttribute('data-rotation', String(angle)); expect(await json(page)).toBe(original)
  }
  await tapWorld(page, es, .5, .5); expect(await json(page)).toBe(original)
  for (const cancel of ['escape', 'blur', 'resize'] as const) {
    await tapWorld(page, es, 3.5, 1.5); await activate(turnRight(page, es), es)
    if (cancel === 'escape') await turnRight(page, es).press('Escape')
    else if (cancel === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    else await page.setViewportSize(es ? { width: 844, height: 390 } : { width: 768, height: 1024 })
    await expect(controls(page)).toHaveCount(0); expect(await json(page)).toBe(original)
  }
})

test('outside action confirms before 3D; write failure preserves the original and retries final angle', async ({ page }, info) => {
  const es = info.project.name === 'phone'; await start(page, es)
  const original = await saved(page)
  await activate(turnRight(page, es), es); await activate(turnRight(page, es), es)
  await page.evaluate(() => sessionStorage.setItem('deny-put', 'yes'))
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.locator('.furniture-feedback[role="alert"]')).toContainText(es ? 'No se pudo guardar' : 'Could not save')
  expect(await saved(page)).toEqual(original); await expect(page.locator('.viewer-canvas')).toHaveCount(0)
  await page.evaluate(() => sessionStorage.removeItem('deny-put'))
  await button(page, es, 'Reintentar cambio', 'Retry change').click()
  await expect.poll(async () => (await saved(page)).furniture[0].rotation).toBe(270)
  await tapWorld(page, es, 3.5, 1.5)
  await activate(turnLeft(page, es), es); await activate(turnLeft(page, es), es)
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true')
  expect((await saved(page)).furniture[0].rotation).toBe(90)
})
