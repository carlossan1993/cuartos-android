import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { Project } from '../src/domain/types.ts'

const button = (page: Page, es: boolean, a: string, b: string) => page.getByRole('button', { name: es ? a : b, exact: true })
const undo = (page: Page, es: boolean) => button(page, es, 'Deshacer', 'Undo')
const redo = (page: Page, es: boolean) => button(page, es, 'Rehacer', 'Redo')
async function json(page: Page): Promise<string> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { const db = request.result, read = db.transaction('projects').objectStore('projects').getAll(); read.onsuccess = () => { db.close(); resolve(read.result[0].json) }; read.onerror = () => { db.close(); reject(read.error) } }
  }))
}
async function project(page: Page): Promise<Project> { return JSON.parse(await json(page)) }
const design = (p: Project) => ({ rooms: p.rooms, openings: p.openings, furniture: p.furniture })
async function start(page: Page, es: boolean) {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && sessionStorage.getItem('deny-put')) throw new DOMException('Full', 'QuotaExceededError')
      return put.apply(this, args)
    }
  })
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/')
  await button(page, es, 'Crear un proyecto', 'Create a project').click()
  await page.locator('#projectName').fill('Historial'); await page.locator('#roomName').fill('Sala')
  await button(page, es, 'Continuar', 'Continue').click(); await button(page, es, 'Crear y guardar', 'Create and save').click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await expect(page.locator('.canvas-surface canvas')).toBeVisible()
}
async function addDoor(page: Page, es: boolean) {
  await button(page, es, 'Añadir puerta', 'Add door').click(); await button(page, es, 'Guardar abertura', 'Save opening').click()
  await expect(page.locator('.opening-form-panel')).toHaveCount(0)
}
async function finish(page: Page, es: boolean, name: string) {
  await button(page, es, 'Editar acabados', 'Edit finishes').click()
  await page.locator('.finish-presets').getByRole('button', { name, exact: true }).click()
  await button(page, es, 'Guardar acabado', 'Save finish').click(); await expect(page.locator('.finish-form')).toHaveCount(0)
}
async function chair(page: Page, es: boolean) {
  await button(page, es, 'Abrir catálogo', 'Open catalog').click(); await page.locator('.furniture-catalog-card').nth(4).click()
  await button(page, es, 'Añadir mueble', 'Add furniture').click(); await expect(page.locator('.furniture-list button')).toHaveCount(1)
}
async function history(page: Page, es: boolean, direction: 'undo' | 'redo') {
  await (direction === 'undo' ? undo(page, es) : redo(page, es)).click()
  await expect(page.locator('.history-feedback')).toContainText(es ? direction === 'undo' ? 'deshecha y guardada' : 'rehecha y guardada' : direction === 'undo' ? 'undone and saved' : 'redone and saved')
}

test('confirmed design history stays shared by the plan, 3D, JSON export and the new branch', async ({ page }, info) => {
  const es = info.project.name === 'phone', errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await start(page, es); await expect(undo(page, es)).toBeDisabled(); await expect(redo(page, es)).toBeDisabled()
  const initial = await project(page)
  await addDoor(page, es); const door = await project(page)
  await finish(page, es, es ? 'Azul profundo' : 'Deep blue'); const blue = await project(page)
  await chair(page, es); const furnished = await project(page)
  await button(page, es, 'Girar 90°', 'Rotate 90°').click()
  await expect.poll(async () => (await project(page)).furniture[0].rotation).toBe(90)
  await history(page, es, 'undo'); expect(design(await project(page))).toEqual(design(furnished))
  await history(page, es, 'undo'); expect(design(await project(page))).toEqual(design(blue))
  await expect(page.locator('.furniture-list button')).toHaveCount(0)
  await history(page, es, 'undo'); expect(design(await project(page))).toEqual(design(door))
  await expect(page.locator('.finish-summary')).not.toContainText(es ? 'Azul profundo' : 'Deep blue')
  await history(page, es, 'undo'); expect(design(await project(page))).toEqual(design(initial)); await expect(undo(page, es)).toBeDisabled()
  await history(page, es, 'redo'); await history(page, es, 'redo'); await history(page, es, 'redo')
  await page.screenshot({ path: `test-results/history-plan-${info.project.name}.png`, fullPage: true })
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click(); await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('.viewer-inventory summary')).toContainText('(1)')
  await history(page, es, 'undo'); await expect(page.locator('.viewer-inventory summary')).toContainText('(0)')
  await history(page, es, 'redo'); await expect(page.locator('.viewer-inventory summary')).toContainText('(1)')
  await page.screenshot({ path: `test-results/history-3d-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: es ? /Volver al plano 2D/ : /Back to 2D plan/ }).click()
  await page.getByRole('button', { name: es ? /Volver al resumen/ : /Back to summary/ }).click()
  const exported = await project(page), download = page.waitForEvent('download')
  await button(page, es, 'Descargar archivo', 'Download file').click()
  expect(JSON.parse(await readFile(await (await download).path() as string, 'utf8'))).toEqual(exported)
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await history(page, es, 'undo'); await finish(page, es, es ? 'Roble' : 'Oak')
  await expect(redo(page, es)).toBeDisabled()
  const branched = await project(page); expect(branched.furniture).toEqual([]); expect(branched.openings).toEqual(door.openings)
  expect(branched.rooms[0].floorMaterial.color).toBe('#c39a68'); expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('text editing, invalid forms, no-op confirmation and a provisional drag do not create history', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await start(page, es); await addDoor(page, es)
  const saved = await json(page)
  await button(page, es, 'Añadir ventana', 'Add window').click()
  await expect(undo(page, es)).toBeDisabled()
  const field = page.locator('#opening-width'); await field.fill('0'); await field.press('Control+z')
  expect(await json(page)).toBe(saved)
  await field.fill('0'); await button(page, es, 'Guardar abertura', 'Save opening').click()
  expect(await json(page)).toBe(saved); await button(page, es, 'Cancelar', 'Cancel').click()
  await button(page, es, 'Editar abertura', 'Edit opening').click(); await button(page, es, 'Guardar abertura', 'Save opening').click()
  await expect(page.locator('.opening-form-panel')).toHaveCount(0)
  expect(await json(page)).toBe(saved)
  await expect(page.locator('.history-count')).toContainText(es ? '1 para deshacer' : '1 to undo')
  await chair(page, es); const p = await project(page), item = p.furniture[0], surface = page.locator('.canvas-surface')
  await surface.scrollIntoViewIfNeeded()
  const box = (await surface.boundingBox())!, width = Math.round(box.width), height = Math.round(box.height)
  const pad = Math.min(64, width * .18, height * .18), scale = Math.min((width - 2 * pad) / 4, (height - 2 * pad) / 3)
  const a = { x: box.x + width / 2 + (item.position.x - 2) * scale, y: box.y + height / 2 + (item.position.y - 1.5) * scale }
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + scale * .4, a.y, { steps: 8 })
  await page.keyboard.press('Control+z'); expect(design(await project(page))).toEqual(design(p))
  await page.mouse.up()
  await expect.poll(async () => (await project(page)).furniture[0].position.x).toBeCloseTo(item.position.x + .4, 1)
  await expect(page.locator('.history-count')).toContainText(es ? '3 para deshacer' : '3 to undo')
  await surface.focus(); await page.keyboard.press('Control+z')
  await expect.poll(async () => design(await project(page))).toEqual(design(p))
  await page.keyboard.press('Control+Shift+z'); await expect.poll(async () => (await project(page)).furniture[0].position.x).toBeCloseTo(item.position.x + .4, 1)
  await page.keyboard.press('Meta+z'); await expect.poll(async () => design(await project(page))).toEqual(design(p))
  await page.keyboard.press('Control+y'); await expect.poll(async () => (await project(page)).furniture[0].position.x).toBeCloseTo(item.position.x + .4, 1)
})

test('failed undo and redo retry safely; external conflicts require explicit reload', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await start(page, es); await addDoor(page, es)
  const saved = await json(page)
  await page.evaluate(() => sessionStorage.setItem('deny-put', 'yes'))
  await undo(page, es).click(); await expect(page.locator('.history-feedback[role="alert"]')).toContainText(es ? 'No se pudo guardar' : 'Could not save')
  expect(await json(page)).toBe(saved); await expect(redo(page, es)).toBeDisabled()
  await page.screenshot({ path: `test-results/history-error-${info.project.name}.png`, fullPage: true })
  await page.evaluate(() => sessionStorage.removeItem('deny-put')); await history(page, es, 'undo')
  const undone = await json(page)
  await page.evaluate(() => sessionStorage.setItem('deny-put', 'yes'))
  await redo(page, es).click(); await expect(page.locator('.history-feedback[role="alert"]')).toBeVisible()
  expect(await json(page)).toBe(undone); await expect(undo(page, es)).toBeDisabled()
  await page.evaluate(() => sessionStorage.removeItem('deny-put')); await history(page, es, 'redo')
  expect(design(await project(page))).toEqual(design(JSON.parse(saved)))
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onsuccess = () => { const db = request.result, tx = db.transaction('projects', 'readwrite'), table = tx.objectStore('projects'), read = table.getAll(); read.onsuccess = () => { const record = read.result[0], p = JSON.parse(record.json); p.rooms[0].floorMaterial = { color: '#112233' }; table.put({ id: record.id, json: JSON.stringify(p) }) }; tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) } }; request.onerror = () => reject(request.error)
  }))
  const external = await json(page)
  await undo(page, es).click(); await expect(page.locator('.history-feedback[role="alert"]')).toContainText(es ? 'otra sesión' : 'another session')
  expect(await json(page)).toBe(external)
  await button(page, es, 'Recargar diseño y vaciar historial', 'Reload design and clear history').click()
  await expect(page.locator('.history-feedback')).toContainText(es ? 'historial de esta sesión se vació' : 'session’s history was cleared')
  await expect(undo(page, es)).toBeDisabled(); await expect(redo(page, es)).toBeDisabled()
  await expect(page.locator('.finish-summary')).toContainText('#112233')
  expect(await json(page)).toBe(external)
})

test('closing and reopening clears history while retaining the confirmed design', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await start(page, es); await addDoor(page, es); await history(page, es, 'undo')
  await expect(redo(page, es)).toBeEnabled()
  const saved = await json(page)
  await page.getByRole('button', { name: es ? /Volver al resumen/ : /Back to summary/ }).click()
  await page.getByRole('button', { name: es ? /Volver a tus proyectos/ : /Back to your projects/ }).click()
  await page.getByRole('button', { name: es ? 'Abrir proyecto: Historial' : 'Open project: Historial', exact: true }).click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await expect(undo(page, es)).toBeDisabled(); await expect(redo(page, es)).toBeDisabled(); expect(await json(page)).toBe(saved)
  await addDoor(page, es); const latest = await json(page)
  await page.reload(); await page.getByRole('button', { name: es ? 'Abrir proyecto: Historial' : 'Open project: Historial', exact: true }).click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await expect(undo(page, es)).toBeDisabled(); expect(await json(page)).toBe(latest)
})
