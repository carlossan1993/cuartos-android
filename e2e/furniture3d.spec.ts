import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import type { FurnitureItem, Project } from '../src/domain/types.ts'

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
async function open3D(page: Page, es: boolean) {
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
}
async function back(page: Page, es: boolean) { await page.getByRole('button', { name: es ? /Volver al plano 2D/ : /Back to 2D plan/ }).click() }
async function bitmap(page: Page) { return createHash('sha256').update(await page.locator('.viewer-canvas canvas').screenshot()).digest('hex') }
async function position(page: Page, es: boolean, x: string, y: string, rotation = '0') {
  await button(page, es, 'Editar posición', 'Edit position').click()
  await page.locator('#furniture-x').fill(x); await page.locator('#furniture-y').fill(y); await page.locator('#furniture-rotation').fill(rotation)
  await button(page, es, 'Guardar posición', 'Save position').click()
  await expect(page.locator('#furniture-position-title')).toHaveCount(0)
}
async function add(page: Page, es: boolean, index: number, x: string, y: string) {
  await button(page, es, 'Abrir catálogo', 'Open catalog').click()
  await page.locator('.furniture-catalog-card').nth(index).click()
  await button(page, es, 'Añadir mueble', 'Add furniture').click()
  await expect(page.locator('#furniture-catalog-title')).toHaveCount(0)
  await position(page, es, x, y)
}

test('2D furniture edits appear in 3D with no second saved model', async ({ page }, info) => {
  const es = info.project.name === 'phone', errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/')
  await button(page, es, 'Crear un proyecto', 'Create a project').click()
  await page.locator('#projectName').fill('Mi espacio'); await page.locator('#roomName').fill('Estudio')
  await button(page, es, 'Continuar', 'Continue').click()
  await page.locator('#width').fill('4.2'); await page.locator('#depth').fill('3.15')
  await button(page, es, 'Crear y guardar', 'Create and save').click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await button(page, es, 'Editar acabados', 'Edit finishes').click()
  await page.locator('.finish-presets button').filter({ hasText: es ? 'Roble' : 'Oak' }).click()
  await button(page, es, 'Guardar acabado', 'Save finish').click()
  await expect(page.locator('.finish-form')).toHaveCount(0)
  await button(page, es, 'Editar acabados', 'Edit finishes').click()
  await page.locator('#finish-surface').selectOption({ index: 2 })
  await page.locator('.finish-presets button').filter({ hasText: es ? 'Azul profundo' : 'Deep blue' }).click()
  await button(page, es, 'Guardar acabado', 'Save finish').click()
  await expect(page.locator('.finish-form')).toHaveCount(0)
  await page.getByRole('checkbox', { name: es ? /^Ajuste:/ : /^Snap:/ }).uncheck()
  await add(page, es, 0, '.75', '1.85')
  await add(page, es, 2, '2.9', '2.6')
  await add(page, es, 6, '2.95', '.55')
  await add(page, es, 4, '2.95', '1.2')
  const original = await savedJson(page)
  await open3D(page, es)
  const initial = await bitmap(page)
  await expect(page.locator('.viewer-inventory summary')).toContainText('(4)')
  await page.locator('.viewer-inventory summary').click()
  await expect(page.locator('.viewer-inventory li')).toHaveCount(4)
  await expect(page.locator('.viewer-inventory li').first()).toContainText(es ? 'Cama individual' : 'Single bed')
  await expect(page.locator('.viewer-inventory li').first()).toContainText(es ? '0,9 × 1,9 × 0,5 m' : '0.9 × 1.9 × 0.5 m')
  await page.locator('.viewer-inventory summary').click()
  await page.screenshot({ path: `test-results/furniture3d-${info.project.name}.png`, fullPage: true })
  await button(page, es, 'Desde arriba', 'Top view').click()
  await page.locator('.viewer-canvas').screenshot({ path: `test-results/furniture3d-top-${info.project.name}.png` })
  expect(await savedJson(page)).toBe(original)
  await back(page, es)
  await page.locator('.furniture-list button').first().click()
  await page.getByRole('checkbox', { name: es ? /^Ajuste:/ : /^Snap:/ }).uncheck()
  await position(page, es, '1.25', '1.7', '35')
  const moved = await savedJson(page), movedProject = JSON.parse(moved)
  expect(movedProject.furniture[0]).toMatchObject({ position: { x: 1.25, y: 1.7 }, rotation: 35 })
  expect(movedProject.rooms).toEqual(JSON.parse(original).rooms)
  await open3D(page, es)
  await expect.poll(() => bitmap(page)).not.toBe(initial)
  const movedImage = await bitmap(page)
  await page.locator('.viewer-inventory summary').click()
  await expect(page.locator('.viewer-inventory li').first()).toContainText('35°')
  expect(await savedJson(page)).toBe(moved)
  await back(page, es)
  await page.locator('.furniture-list button').first().click()
  await button(page, es, 'Duplicar', 'Duplicate').click()
  await expect(page.locator('.furniture-list button')).toHaveCount(5)
  const duplicated = await savedJson(page)
  await open3D(page, es)
  await expect(page.locator('.viewer-inventory summary')).toContainText('(5)')
  await expect.poll(() => bitmap(page)).not.toBe(movedImage)
  expect(await savedJson(page)).toBe(duplicated)
  await back(page, es)
  await page.locator('.furniture-list button').last().click()
  await button(page, es, 'Eliminar mueble', 'Delete furniture').click()
  await expect(page.locator('.furniture-list button')).toHaveCount(4)
  const removed = await savedJson(page)
  await open3D(page, es)
  await expect.poll(() => bitmap(page)).toBe(movedImage)
  await page.getByRole('combobox', { name: es ? 'Idioma' : 'Language', exact: true }).selectOption(es ? 'en' : 'es')
  await page.locator('.viewer-inventory summary').click()
  await expect(page.locator('.viewer-inventory li').first()).toContainText(es ? 'Single bed' : 'Cama individual')
  expect(await savedJson(page)).toBe(removed)
  await page.reload()
  await page.getByRole('button', { name: /Mi espacio/ }).click()
  await button(page, !es, 'Abrir plano 2D', 'Open 2D plan').click()
  await open3D(page, !es)
  await expect(page.locator('.viewer-inventory summary')).toContainText('(4)')
  await page.locator('.viewer-inventory summary').click()
  await expect(page.locator('.viewer-inventory li').first()).toContainText('35°')
  await expect(page.locator('.viewer-inventory li').first()).toContainText(es ? 'X 1.25 m' : 'X 1,25 m')
  expect(await savedJson(page)).toBe(removed)
  expect(errors).toEqual([])
})

test('all 16 local pieces, legacy sizes and unknown IDs render offline and survive context recovery', async ({ page }, info) => {
  const es = info.project.name === 'phone', errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/')
  await expect(button(page, es, 'Crear un proyecto', 'Create a project')).toBeVisible()
  // Schema-1 fixture independent of renderer/catalog code, including old stored sizes.
  const entries: [string, number, number, number][] = [
    ['bed-single', .7, 1.5, .9], ['bed-double', 1.5, 2, .55], ['sofa', 2, .85, .85], ['armchair', .85, .85, .85],
    ['chair', .45, .5, .9], ['dining-table', 1.4, .8, .75], ['desk', 1.2, .6, .75], ['coffee-table', 1, .6, .4],
    ['nightstand', .45, .4, .55], ['wardrobe', 1.6, .6, 2], ['bookshelf', .8, .3, 1.8], ['tv-unit', 1.4, .4, .55],
    ['fridge', .7, .7, 1.8], ['stove', .6, .6, .9], ['sink', .6, .5, .85], ['toilet', .4, .7, .8],
  ]
  const noOverrides: FurnitureItem['materialOverrides'] = {}
  const project: Project = { id: 'gallery', name: 'Atelier', schemaVersion: 1, createdAt: '2026-10-23T12:00:00.000Z', updatedAt: '2026-10-23T12:00:00.000Z', languageMetadata: { createdWith: es ? 'es' : 'en' },
    rooms: [{ id: 'room', name: 'Colección', polygon: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 9, y: 0 }, { id: 'c', x: 9, y: 10 }, { id: 'd', x: 0, y: 10 }], height: 2.6, wallThickness: .12, floorMaterial: { color: '#f2eee5' }, wallMaterials: Object.fromEntries(['a:b', 'b:c', 'c:d', 'd:a'].map(edge => [`room:${edge}`, { color: '#ffffff' }])) }],
    openings: [], viewSettings: { grid: true, snap: true, gridSize: .1, zoom2d: 1, camera3d: { position: { x: 6, y: 6, z: 6 }, target: { x: 0, y: 0, z: 0 } } },
    furniture: entries.map<FurnitureItem>(([catalogId, width, depth, height], i) => ({ id: `piece-${i}`, roomId: 'room', catalogId, position: { x: 1.2 + i % 4 * 2.2, y: 1.2 + Math.floor(i / 4) * 2.4 }, rotation: 0, dimensions: { width, depth, height }, materialOverrides: i === 0 ? { body: { color: '#03038c', textureId: 'unknown-texture' } } : noOverrides })) }
  const withUnknown: Project = { ...project, furniture: [...project.furniture, { id: 'unknown', roomId: 'room', catalogId: 'future-item', position: { x: 10, y: 4 }, rotation: 37, dimensions: { width: .9, depth: 1.3, height: .65 }, materialOverrides: { body: { color: '#03038c' }, future: { color: '#abcdef' } } }] }
  const json = JSON.stringify(withUnknown)
  await page.evaluate(json => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('projects', 'readwrite')
      tx.objectStore('projects').add({ id: 'gallery', json })
      tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), json)
  await page.reload()
  await page.getByRole('button', { name: /Atelier/ }).click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await open3D(page, es)
  await expect(page.locator('.viewer-inventory summary')).toContainText('(17)')
  await page.locator('.viewer-inventory summary').click()
  await expect(page.locator('.viewer-inventory li')).toHaveCount(17)
  await expect(page.locator('.viewer-inventory li').last()).toContainText(es ? 'Mueble sin catálogo' : 'Unlisted furniture')
  await expect(page.locator('.viewer-inventory li').first()).toContainText(es ? '0,7 × 1,5 × 0,9 m' : '0.7 × 1.5 × 0.9 m')
  await page.locator('.viewer-inventory summary').click()
  await page.locator('.viewer-canvas').screenshot({ path: `test-results/furniture3d-collection-${info.project.name}.png` })
  await button(page, es, 'Desde arriba', 'Top view').click()
  await page.locator('.viewer-canvas').screenshot({ path: `test-results/furniture3d-catalog-${info.project.name}.png` })
  const before = await bitmap(page)
  expect(await savedJson(page)).toBe(json)
  const lost = await page.locator('.viewer-canvas canvas').evaluate((canvas: HTMLCanvasElement) => { const extension = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context'); extension?.loseContext(); return !!extension })
  expect(lost).toBe(true)
  await expect(page.getByRole('alert')).toContainText(es ? 'se interrumpió' : 'was interrupted')
  await button(page, es, 'Reintentar', 'Try again').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  await button(page, es, 'Desde arriba', 'Top view').click()
  await expect.poll(() => bitmap(page)).toBe(before)
  expect(await savedJson(page)).toBe(json)
  expect(errors).toEqual([])
})
