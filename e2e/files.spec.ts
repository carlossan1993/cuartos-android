import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { Project, Room } from '../src/domain/types.ts'

const button = (page: Page, es: boolean, spanish: string, english: string) => page.getByRole('button', { name: es ? spanish : english, exact: true })
function fixture(shape: 'rectangle' | 'l' | 'connected' = 'connected'): Project {
  const room = (id: string, name: string, points: number[][], color: string): Room => {
    const polygon = points.map(([x, y], i) => ({ id: `v${i}`, x, y }))
    return { id, name, polygon, height: 2.6, wallThickness: .12, floorMaterial: { color, textureId: 'floor-planks' }, wallMaterials: Object.fromEntries(polygon.map((v, i) => [`${id}:${v.id}:${polygon[(i + 1) % polygon.length].id}`, { color: '#ffffff' }])) }
  }
  const first = room('room-1', 'Sala', shape === 'l' ? [[0, 0], [4, 0], [4, 1.5], [2, 1.5], [2, 3], [0, 3]] : [[0, 0], [4, 0], [4, 3], [0, 3]], '#03038c')
  return { id: 'project-source', name: 'Casa Ñandú', schemaVersion: 1, createdAt: '2026-10-23T18:00:00.000Z', updatedAt: '2026-10-23T18:00:00.000Z', languageMetadata: { createdWith: 'es' },
    viewSettings: { grid: false, snap: false, gridSize: .1, zoom2d: 1.5625, camera3d: { position: { x: 6, y: 6, z: 6 }, target: { x: 0, y: 0, z: 0 } } },
    rooms: [first, ...(shape === 'connected' ? [room('room-2', 'Estudio', [[4, 0], [7, 0], [7, 3], [4, 3]], '#c39a68')] : [])],
    openings: [{ id: 'door', roomId: first.id, wallId: 'room-1:v0:v1', type: 'door', offset: .3, width: .8, height: 2, sillHeight: 0 }],
    furniture: [{ id: 'desk', roomId: first.id, catalogId: 'desk', position: { x: 1.2, y: 1.0 }, rotation: 27, dimensions: { width: 1.2, depth: .6, height: .75 }, materialOverrides: { body: { color: '#ddbd91' } } }],
  }
}
async function stored(page: Page): Promise<{ id: string; json: string }[]> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { const db = request.result, read = db.transaction('projects').objectStore('projects').getAll(); read.onsuccess = () => { db.close(); resolve(read.result) }; read.onerror = () => { db.close(); reject(read.error) } }
  }))
}
async function start(page: Page, es: boolean, p = fixture()) {
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/')
  await page.evaluate(project => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' })
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { const db = request.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').add({ id: project.id, json: JSON.stringify(project) }); tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) } }
  }), p)
  await page.reload()
  await page.getByRole('button', { name: es ? 'Abrir proyecto: Casa Ñandú' : 'Open project: Casa Ñandú', exact: true }).click()
}
async function home(page: Page, es: boolean) { await page.getByRole('button', { name: es ? /Volver a tus proyectos/ : /Back to your projects/ }).click(); await expect(page.locator('.project-card')).toHaveCount(1) }
async function choose(page: Page, p: Project | string, name = 'cuartos.json') {
  await page.locator('#import-project-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(typeof p === 'string' ? p : JSON.stringify(p)) })
}
async function download(page: Page, es: boolean, path?: string) {
  const event = page.waitForEvent('download')
  await button(page, es, 'Descargar archivo', 'Download file').click()
  const result = await event
  expect(await result.failure()).toBeNull()
  if (path) await result.saveAs(path)
  return { name: result.suggestedFilename(), bytes: await readFile((await result.path())!) }
}

for (const shape of ['rectangle', 'l', 'connected'] as const) test(`JSON and PNG round-trip ${shape} offline without overwriting the source`, async ({ page }, info) => {
  const es = info.project.name === 'phone', p = fixture(shape), json = JSON.stringify(p)
  await start(page, es, p)
  const file = await download(page, es)
  expect(file.name).toBe('cuartos-Casa-Nandu.json'); expect(file.bytes.toString('utf8')).toBe(json)
  await page.locator('#export-format').selectOption('png')
  await expect(page.locator('#export-resolution')).toHaveValue('2048')
  const png = await download(page, es, `test-results/export-${shape}-${info.project.name}.png`)
  expect(png.name).toBe('cuartos-Casa-Nandu.png'); expect(png.bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  expect([png.bytes.readUInt32BE(16), png.bytes.readUInt32BE(20)]).toEqual([2048, 1536])
  const pixels = await page.evaluate(async base64 => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let blue = 0, furniture = 0, transparent = 0
    for (let i = 0; i < data.length; i += 4) { if (data[i] === 3 && data[i + 1] === 3 && data[i + 2] === 140) blue++; if (data[i] === 221 && data[i + 1] === 189 && data[i + 2] === 145) furniture++; if (data[i + 3] !== 255) transparent++ }
    return { blue, furniture, transparent }
  }, png.bytes.toString('base64'))
  expect(pixels.blue).toBeGreaterThan(100_000); expect(pixels.furniture).toBeGreaterThan(1000); expect(pixels.transparent).toBe(0)
  // White edging keeps the blue door leaf distinguishable from a blue floor.
  const contrast = await page.evaluate(async ({ base64, roomsWidth }) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    const scale = Math.min(896 / roomsWidth, 640 / 3), x = Math.round((512 - roomsWidth / 2 * scale + .3 * scale) * 2), y = Math.round((384 - 1.5 * scale + .4 * scale) * 2)
    const data = context.getImageData(x - 6, y - 10, 12, 20).data
    let white = 0
    for (let i = 0; i < data.length; i += 4) if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) white++
    return white
  }, { base64: png.bytes.toString('base64'), roomsWidth: shape === 'connected' ? 7 : 4 })
  expect(contrast).toBeGreaterThan(20)
  expect(await stored(page)).toEqual([{ id: p.id, json }])
  await home(page, es); await button(page, es, 'Importar proyecto', 'Import a project').click()
  await page.locator('#import-project-file').setInputFiles({ name: file.name, mimeType: 'application/json', buffer: file.bytes })
  await expect(page.locator('.import-preview h2')).toHaveText(p.name)
  await page.locator('#import-project-name').fill(`Copia ${shape}`)
  await page.screenshot({ path: `test-results/files-import-${info.project.name}.png`, fullPage: true })
  await button(page, es, 'Importar como copia', 'Import as a copy').click()
  await expect(page.getByRole('heading', { name: `Copia ${shape}`, exact: true })).toBeVisible()
  const records = await stored(page), copy = JSON.parse(records.find(r => r.id !== p.id)!.json)
  expect(records.find(r => r.id === p.id)!.json).toBe(json); expect(copy.viewSettings).toEqual(p.viewSettings); expect(copy.languageMetadata).toEqual(p.languageMetadata)
  expect(copy.rooms.map((r: { polygon: { x: number; y: number }[] }) => r.polygon.map(({ x, y }) => ({ x, y })))).toEqual(p.rooms.map(r => r.polygon.map(({ x, y }) => ({ x, y }))))
  expect(copy.rooms.map((r: { id: string }) => r.id)).not.toEqual(p.rooms.map(r => r.id)); expect(copy.openings[0].roomId).toBe(copy.rooms[0].id); expect(copy.openings[0].id).not.toBe('door'); expect(copy.furniture[0].materialOverrides).toEqual(p.furniture[0].materialOverrides)
  await page.reload(); await page.getByRole('button', { name: es ? `Abrir proyecto: Copia ${shape}` : `Open project: Copia ${shape}`, exact: true }).click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click(); await expect(page.locator('.furniture-list button')).toHaveCount(1); await expect(page.locator('.opening-list button')).toHaveCount(1)
})

test('invalid files, cancellation, language changes and a failed import keep the original and retry the same copy', async ({ page }, info) => {
  const es = info.project.name === 'phone', p = fixture()
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (...args) { if (sessionStorage.getItem('deny-import') && this.name === 'projects') throw new DOMException('Full', 'QuotaExceededError'); return original.apply(this, args) }
    const read = Blob.prototype.arrayBuffer
    Blob.prototype.arrayBuffer = function () { if (this instanceof File && sessionStorage.getItem('deny-read')) return Promise.reject(new Error('Unavailable')); return read.call(this) }
  })
  await start(page, es); await home(page, es)
  const before = await stored(page)
  await button(page, es, 'Importar proyecto', 'Import a project').click()
  await page.evaluate(() => sessionStorage.setItem('deny-read', 'yes'))
  await choose(page, p); await expect(page.getByRole('alert')).toContainText(es ? 'No pudimos leer' : 'could not read')
  expect(await stored(page)).toEqual(before)
  await page.evaluate(() => sessionStorage.removeItem('deny-read'))
  await choose(page, p); await expect(page.locator('.import-preview')).toBeVisible()
  for (const value of ['{bad', JSON.stringify({ ...p, schemaVersion: 99 }), JSON.stringify({ ...p, openings: [{ ...p.openings[0], roomId: 'missing' }] }), ' '.repeat(2 * 1024 * 1024 + 1)]) {
    await choose(page, value)
    await expect(page.getByRole('alert')).toBeVisible(); await expect(page.locator('.import-preview')).toHaveCount(0); expect(await stored(page)).toEqual(before)
  }
  await choose(page, p); await page.locator('#import-project-name').fill(' ')
  await button(page, es, 'Importar como copia', 'Import as a copy').click(); await expect(page.locator('#import-project-name')).toHaveAttribute('aria-invalid', 'true')
  await page.locator('#import-project-name').fill('Importación final')
  await page.getByRole('combobox', { name: es ? 'Idioma' : 'Language', exact: true }).selectOption(es ? 'en' : 'es')
  await expect(page.locator('#import-project-name')).toHaveValue('Importación final')
  await page.getByRole('combobox', { name: es ? 'Language' : 'Idioma', exact: true }).selectOption(es ? 'es' : 'en')
  await page.evaluate(() => sessionStorage.setItem('deny-import', 'yes'))
  await button(page, es, 'Importar como copia', 'Import as a copy').click(); await expect(page.getByRole('alert')).toContainText(es ? 'No se pudo guardar' : 'could not be saved')
  expect(await stored(page)).toEqual(before)
  await page.screenshot({ path: `test-results/files-import-error-${info.project.name}.png`, fullPage: true })
  await page.evaluate(() => sessionStorage.removeItem('deny-import'))
  await button(page, es, 'Importar como copia', 'Import as a copy').click(); await expect(page.getByRole('heading', { name: 'Importación final', exact: true })).toBeVisible(); expect(await stored(page)).toHaveLength(2)
  await page.getByRole('button', { name: es ? /Volver a tus proyectos/ : /Back to your projects/ }).click()
  await button(page, es, 'Importar proyecto', 'Import a project').click(); await choose(page, p)
  await page.locator('.import-page .back-link').click(); await expect(page.locator('.project-card')).toHaveCount(2)
  expect(await stored(page)).toHaveLength(2)
})

test('PNG export ignores pan, zoom and selection; pixel sizes are explicit and encoding errors can retry', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function (callback, ...args) { if (sessionStorage.getItem('deny-png')) callback(null); else original.call(this, callback, ...args) } })
  await start(page, es)
  const original = await stored(page)
  await page.locator('#export-format').selectOption('png'); await page.locator('#export-resolution').selectOption('1024')
  await page.evaluate(() => sessionStorage.setItem('deny-png', 'yes'))
  await button(page, es, 'Descargar archivo', 'Download file').click(); await expect(page.getByRole('alert')).toContainText(es ? 'preparar la imagen' : 'prepare the image')
  expect(await stored(page)).toEqual(original)
  await page.evaluate(() => sessionStorage.removeItem('deny-png'))
  const before = await download(page, es)
  expect([before.bytes.readUInt32BE(16), before.bytes.readUInt32BE(20)]).toEqual([1024, 768])
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await button(page, es, 'Acercar', 'Zoom in').click()
  await page.locator('.canvas-surface').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter')
  await expect(page.locator('output')).toHaveText('195%')
  await page.getByRole('button', { name: es ? /Volver al resumen/ : /Back to summary/ }).click()
  await page.locator('#export-format').selectOption('png'); await page.locator('#export-resolution').selectOption('1024')
  const after = await download(page, es)
  expect(after.bytes).toEqual(before.bytes); expect(await stored(page)).toEqual(original)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('.file-panel').screenshot({ path: `test-results/files-export-${info.project.name}.png` })
})

test('Android delivery uses Filesystem then a save chooser or Share, handling cancel and write failures', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await page.addInitScript(() => {
    const state = { calls: [] as { plugin: string; method: string; options: Record<string, unknown> }[], mode: 'saved' }
    Object.assign(window, { fileBridge: state, androidBridge: {}, Capacitor: {
      PluginHeaders: [{ name: 'Filesystem', methods: ['writeFile', 'readdir', 'rmdir'].map(name => ({ name, rtype: 'promise' })) }, { name: 'Share', methods: [{ name: 'share', rtype: 'promise' }] }, { name: 'CuartosDocument', methods: [{ name: 'save', rtype: 'promise' }] }],
      nativePromise: async (plugin: string, method: string, options: Record<string, unknown>) => {
        state.calls.push({ plugin, method, options })
        if (method === 'readdir') return { files: [] }
        if (plugin === 'Filesystem' && method === 'writeFile') { if (state.mode === 'fail') throw new Error('Full'); return { uri: `file:///cache/${options.path}` } }
        if (plugin === 'CuartosDocument') return { status: state.mode === 'cancel' ? 'cancelled' : 'saved' }
        if (plugin === 'Share') { if (state.mode === 'cancel') throw new Error('Share canceled'); return { activityType: 'test.app' } }
        return {}
      },
    } })
  })
  await start(page, es)
  const before = await stored(page)
  await button(page, es, 'Guardar archivo', 'Save file').click(); await expect(page.getByRole('status').filter({ hasText: es ? 'ubicación que elegiste' : 'location you chose' })).toBeVisible()
  let calls = await page.evaluate(() => (window as unknown as { fileBridge: { calls: { plugin: string; method: string; options: Record<string, string> }[] } }).fileBridge.calls)
  const write = calls.find(call => call.method === 'writeFile')!, save = calls.find(call => call.plugin === 'CuartosDocument')!
  expect(write.options.directory).toBe('CACHE'); expect(write.options.path).toMatch(/^cuartos-exports\/[A-Za-z0-9_-]+\/cuartos-Casa-Nandu.json$/)
  expect(Buffer.from(write.options.data, 'base64').toString('utf8')).toBe(before[0].json); expect(save.options.path).toBe(write.options.path); expect(calls.some(c => c.plugin === 'Share')).toBe(false)
  await page.evaluate(() => { (window as unknown as { fileBridge: { mode: string } }).fileBridge.mode = 'cancel' })
  await button(page, es, 'Guardar archivo', 'Save file').click(); await expect(page.locator('.file-panel [role=status]')).toContainText(es ? 'cancelada' : 'cancelled')
  await button(page, es, 'Compartir archivo', 'Share file').click(); await expect(page.locator('.file-panel [role=status]')).toContainText(es ? 'cancelada' : 'cancelled')
  await page.evaluate(() => { (window as unknown as { fileBridge: { mode: string; calls: unknown[] } }).fileBridge.mode = 'fail'; (window as unknown as { fileBridge: { calls: unknown[] } }).fileBridge.calls = [] })
  await button(page, es, 'Compartir archivo', 'Share file').click(); await expect(page.getByRole('alert')).toContainText(es ? 'No se pudo guardar o compartir' : 'could not be saved or shared')
  calls = await page.evaluate(() => (window as unknown as { fileBridge: { calls: typeof calls } }).fileBridge.calls)
  expect(calls.some(c => c.plugin === 'Share' || c.plugin === 'CuartosDocument')).toBe(false)
  await page.evaluate(() => { (window as unknown as { fileBridge: { mode: string } }).fileBridge.mode = 'saved' })
  await page.locator('#export-format').selectOption('png'); await page.locator('#export-resolution').selectOption('1024')
  await button(page, es, 'Compartir archivo', 'Share file').click(); await expect(page.locator('.file-panel [role=status]')).toContainText(es ? 'aplicación que elegiste' : 'app you chose')
  calls = await page.evaluate(() => (window as unknown as { fileBridge: { calls: typeof calls } }).fileBridge.calls)
  const shared = calls.find(c => c.plugin === 'Share')!
  expect(shared.options.files).toEqual([expect.stringMatching(/^file:\/\/\/cache\/cuartos-exports\/.+\.png$/)])
  expect(await stored(page)).toEqual(before)
})
