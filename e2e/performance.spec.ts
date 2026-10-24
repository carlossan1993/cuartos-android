import { expect, test, type Page } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'
import type { Project } from '../src/domain/types.ts'

interface GpuStats { buffersCreated: number; buffersDeleted: number; uploads: number; uploadedBytes: number; draws: number; offscreenDraws: number; texturesCreated: number; texturesDeleted: number; liveBuffers: number; contextsLost: number }
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const data: GpuStats = { buffersCreated: 0, buffersDeleted: 0, uploads: 0, uploadedBytes: 0, draws: 0, offscreenDraws: 0, texturesCreated: 0, texturesDeleted: 0, liveBuffers: 0, contextsLost: 0 }
    const buffers = new Map<WebGLBuffer, WebGL2RenderingContext>(), contexts = new WeakSet<WebGL2RenderingContext>(), proto = WebGL2RenderingContext.prototype
    const methods = ['createBuffer', 'deleteBuffer', 'bufferData', 'bufferSubData', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'createTexture', 'deleteTexture'] as const
    for (const method of methods) {
      const original = proto[method]
      Object.defineProperty(proto, method, { configurable: true, writable: true, value: function(this: WebGL2RenderingContext, ...args: unknown[]) {
        if (!contexts.has(this)) { contexts.add(this); this.canvas.addEventListener('webglcontextlost', () => { data.contextsLost++; for (const [buffer, owner] of buffers) if (owner === this) buffers.delete(buffer); data.liveBuffers = buffers.size }) }
        const result = Reflect.apply(original, this, args)
        if (method === 'createBuffer' && result) { data.buffersCreated++; buffers.set(result, this) }
        if (method === 'deleteBuffer' && buffers.delete(args[0] as WebGLBuffer)) data.buffersDeleted++
        if (method === 'bufferData' || method === 'bufferSubData') { data.uploads++; const value = args[method === 'bufferData' ? 1 : 2]; data.uploadedBytes += typeof value === 'number' ? value : ArrayBuffer.isView(value) || value instanceof ArrayBuffer ? value.byteLength : 0 }
        if (method.startsWith('draw')) { data.draws++; if (this.getParameter(this.DRAW_FRAMEBUFFER_BINDING)) data.offscreenDraws++ }
        if (method === 'createTexture') data.texturesCreated++
        if (method === 'deleteTexture' && args[0]) data.texturesDeleted++
        data.liveBuffers = buffers.size
        return result
      } })
    }
    Object.assign(window, { gpuStats: data })
  })
}
const button = (page: Page, es: boolean, a: string, b: string) => page.getByRole('button', { name: es ? a : b, exact: true })
async function stats(page: Page): Promise<GpuStats> { return page.evaluate(() => ({ ...(window as unknown as { gpuStats: GpuStats }).gpuStats })) }
function delta(after: GpuStats, before: GpuStats) { return Object.fromEntries(Object.keys(after).map(key => [key, after[key as keyof GpuStats] - before[key as keyof GpuStats]])) }
async function resources(page: Page) {
  return page.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/assets/')).map(entry => { const r = entry as PerformanceResourceTiming; return { file: new URL(r.name).pathname.split('/').at(-1)!, decodedBytes: r.decodedBodySize, encodedBytes: r.encodedBodySize, durationMs: r.duration } }))
}
async function stored(page: Page): Promise<string> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('cuartos-local'); request.onerror = () => reject(request.error)
    request.onsuccess = () => { const db = request.result, get = db.transaction('projects').objectStore('projects').getAll(); get.onsuccess = () => { db.close(); resolve(get.result[0].json) } }
  }))
}
async function fixture(page: Page, es: boolean, shape: string) {
  await page.goto('/'); await button(page, es, 'Crear un proyecto', 'Create a project').click()
  await page.locator('#projectName').fill(`Performance ${shape}`); await page.locator('#roomName').fill('Sala')
  await page.locator(`input[name="shape"][value="${shape}"]`).check()
  if (shape === 'connected') await page.locator('#room2Name').fill('Estudio')
  await button(page, es, 'Continuar', 'Continue').click(); await page.locator('#width').fill('8'); await page.locator('#depth').fill('8'); await page.locator('#height').fill('3')
  if (shape === 'l') { await page.locator('#cutWidth').fill('3'); await page.locator('#cutDepth').fill('3') }
  if (shape === 'connected') { await page.locator('#width2').fill('8'); await page.locator('#depth2').fill('8') }
  await button(page, es, 'Crear y guardar', 'Create and save').click(); await expect(page.locator('.project-summary')).toBeVisible()
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('cuartos-local'); request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('projects', 'readwrite'), table = tx.objectStore('projects'), get = table.getAll()
      get.onsuccess = () => {
        const p: Project = JSON.parse(get.result[0].json)
        const catalog = [ ['bed-single', .9, 1.9, .5], ['bed-double', 1.5, 2, .55], ['sofa', 2, .85, .85], ['armchair', .85, .85, .85], ['chair', .45, .5, .9], ['dining-table', 1.4, .8, .75], ['desk', 1.2, .6, .75], ['coffee-table', 1, .6, .4], ['nightstand', .45, .4, .55], ['wardrobe', 1.6, .6, 2], ['bookshelf', .8, .3, 1.8], ['tv-unit', 1.4, .4, .55], ['fridge', .7, .7, 1.8], ['stove', .6, .6, .9], ['sink', .6, .5, .85], ['toilet', .4, .7, .8] ] as const
        const rooms = p.rooms.map((room, i) => ({ ...room, floorMaterial: { color: i ? '#03038c' : '#c39a68', textureId: i ? 'floor-tiles' : 'floor-planks' } }))
        const furniture = catalog.map(([catalogId, width, depth, height], i) => {
          const r = i % rooms.length, room = rooms[r], slot = Math.floor(i / rooms.length), minX = Math.min(...room.polygon.map(v => v.x)), minY = Math.min(...room.polygon.map(v => v.y))
          let x = 1.5 + slot % 4 * 1.5, y = 1.5 + Math.floor(slot / 4) * 1.3
          if (room.polygon.length === 6 && x > 4.5 && y > 4.5) x = 3.8
          return { id: `bench-${i}`, roomId: room.id, catalogId, position: { x: minX + x, y: minY + y }, rotation: i % 4 * 90, dimensions: { width, depth, height }, materialOverrides: {} }
        })
        const openings = rooms.map((room, i) => ({ id: `door-${i}`, roomId: room.id, wallId: `${room.id}:${room.polygon[0].id}:${room.polygon[1].id}`, type: 'door', offset: .4, width: .9, height: 2.1, sillHeight: 0 }))
        table.put({ id: p.id, json: JSON.stringify({ ...p, rooms, furniture, openings }) })
      }
      tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
  await page.reload()
  await page.getByRole('button', { name: new RegExp(`^${es ? 'Abrir proyecto' : 'Open project'}: Performance`) }).click()
}
for (const shape of ['rectangle', 'l', 'connected']) test(`resource budgets and repeat navigation: ${shape}`, async ({ page, browserName, browser }, info) => {
  test.setTimeout(60000)
  const es = info.project.name === 'phone', baseline = process.env.CUARTOS_PERF_PHASE === 'before'
  await instrument(page)
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await fixture(page, es, shape)
  const original = JSON.parse(await stored(page)) as Project, home = await resources(page), begin2d = Date.now()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click(); await expect(page.locator('.canvas-surface canvas')).toBeVisible()
  const ready2dMs = Date.now() - begin2d, editor = await resources(page), begin3d = Date.now()
  expect(home.some(resource => /PlanDrawing-|Editor2D-|Viewer3D-/.test(resource.file))).toBe(false)
  expect(editor.some(resource => /Viewer3D-/.test(resource.file))).toBe(false)
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click(); await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true')
  const ready3dMs = Date.now() - begin3d
  await page.waitForTimeout(350); const initial = await stats(page)
  await page.waitForTimeout(250); const idle = delta(await stats(page), initial)
  expect(idle.draws).toBe(0)
  const beforeCamera = await stats(page)
  await button(page, es, 'Acercar', 'Zoom in').click(); await page.waitForTimeout(200)
  const camera = delta(await stats(page), beforeCamera), beforeSave = await stats(page)
  await button(page, es, 'Recordar cámara 3D', 'Remember 3D camera').click(); await expect(page.locator('.save-indicator')).toContainText(es ? 'Diseño guardado' : 'Design saved'); await page.waitForTimeout(250)
  const preferences = delta(await stats(page), beforeSave), viewer = await resources(page), cycles: GpuStats[] = []
  await page.locator('.viewer-canvas').screenshot({ path: `test-results/performance-${process.env.CUARTOS_PERF_PHASE ?? 'after'}-${info.project.name}-${shape}.png` })
  const cutaway = page.getByRole('checkbox', { name: es ? 'Vista abierta' : 'Cutaway view', exact: true }), beforeCutaway = await stats(page)
  await cutaway.uncheck()
  await expect.poll(async () => (await stats(page)).offscreenDraws).toBeGreaterThan(beforeCutaway.offscreenDraws)
  await page.waitForTimeout(100)
  const closedCutaway = await stats(page)
  await cutaway.check()
  await expect.poll(async () => (await stats(page)).offscreenDraws).toBeGreaterThan(closedCutaway.offscreenDraws)
  const cutawayChanges = delta(await stats(page), beforeCutaway)
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: es ? /Volver al plano 2D/ : /Back to 2D plan/ }).click()
    await expect.poll(async () => (await stats(page)).liveBuffers, { timeout: 5000 }).toBe(0)
    cycles.push(await stats(page))
    if (i < 2) { await button(page, es, 'Ver habitación 3D', 'View room in 3D').click(); await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true') }
  }
  const last = JSON.parse(await stored(page)) as Project
  expect(last.rooms).toEqual(original.rooms); expect(last.openings).toEqual(original.openings); expect(last.furniture).toEqual(original.furniture)
  if (!baseline) { expect(camera.buffersCreated).toBe(0); expect(camera.uploads).toBe(0); expect(camera.offscreenDraws).toBe(0); expect(preferences.buffersCreated).toBe(0); expect(preferences.uploads).toBe(0); expect(preferences.offscreenDraws).toBe(0) }
  const report = { phase: process.env.CUARTOS_PERF_PHASE ?? 'after', shape, device: info.project.name, browserName, browserVersion: browser.version(), userAgent: await page.evaluate(() => navigator.userAgent), viewport: page.viewportSize(), dpr: await page.evaluate(() => devicePixelRatio), ready2dMs, ready3dMs, home, editor, viewer, initial, idle, camera, preferences, cutawayChanges, cycles }
  await mkdir('test-results', { recursive: true }); await writeFile(`test-results/performance-${report.phase}-${report.device}-${shape}.json`, JSON.stringify(report, null, 2))
})
