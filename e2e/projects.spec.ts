import { expect, test, type Page } from '@playwright/test'

const button = (page: Page, es: boolean, spanish: string, english: string) => page.getByRole('button', { name: es ? spanish : english, exact: true })
async function records(page: Page): Promise<{ id: string; json: string }[]> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { const db = request.result, tx = db.transaction('projects'), read = tx.objectStore('projects').getAll(); read.onsuccess = () => { db.close(); resolve(read.result) }; read.onerror = () => { db.close(); reject(read.error) } }
  }))
}
async function json(page: Page) { return (await records(page))[0].json }
async function start(page: Page, es: boolean, connected = false) {
  await page.addInitScript(() => {
    for (const method of ['put', 'add', 'delete', 'get'] as const) {
      const original = IDBObjectStore.prototype[method]
      Object.defineProperty(IDBObjectStore.prototype, method, { configurable: true, writable: true, value: function(this: IDBObjectStore, ...args: unknown[]) {
        if (this.name === 'projects' && sessionStorage.getItem(`deny-${method}`)) throw new DOMException('Unavailable', method === 'get' ? 'UnknownError' : 'QuotaExceededError')
        return Reflect.apply(original, this, args)
      } })
    }
  })
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/')
  await button(page, es, 'Crear un proyecto', 'Create a project').click()
  await page.locator('#projectName').fill('Casa principal'); await page.locator('#roomName').fill('Sala')
  if (connected) { await page.locator('input[name="shape"][value="connected"]').check(); await page.locator('#room2Name').fill('Estudio') }
  await button(page, es, 'Continuar', 'Continue').click()
  await button(page, es, 'Crear y guardar', 'Create and save').click()
}
async function home(page: Page, es: boolean) { await page.getByRole('button', { name: es ? /Volver a tus proyectos/ : /Back to your projects/ }).click(); await expect(page.locator('.project-card')).toHaveCount(1) }
const actions = (page: Page, es: boolean, name: string) => page.getByRole('group', { name: es ? `Acciones de ${name}` : `Actions for ${name}`, exact: true })
async function manage(page: Page, es: boolean, name: string, action: 'rename' | 'duplicate' | 'remove') {
  const labels = { rename: ['Renombrar', 'Rename'], duplicate: ['Duplicar', 'Duplicate'], remove: ['Eliminar', 'Delete'] }
  await actions(page, es, name).getByRole('button', { name: labels[action][es ? 0 : 1], exact: true }).click()
  await expect(page.locator('.project-manager')).toBeVisible()
  await expect(page.locator('.project-manager')).toHaveAttribute('aria-busy', 'false')
}
async function externalChange(page: Page, name: string, remove = false) {
  await page.evaluate(({ name, remove }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('projects', 'readwrite'), table = tx.objectStore('projects'), read = table.getAll()
      read.onsuccess = () => {
        const record = read.result[0]
        if (remove) table.delete(record.id)
        else { const project = JSON.parse(record.json); project.name = name; project.rooms[0].floorMaterial.color = '#112233'; project.updatedAt = new Date(Math.max(Date.now(), Date.parse(project.updatedAt))).toISOString(); table.put({ ...record, json: JSON.stringify(project) }) }
      }
      tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }), { name, remove })
}

test('rename/copy/delete preserve the original and retry failed transactions offline', async ({ page }, info) => {
  test.setTimeout(60000)
  const es = info.project.name === 'phone'
  await start(page, es, true)
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await button(page, es, 'Añadir puerta', 'Add door').click(); await button(page, es, 'Guardar abertura', 'Save opening').click()
  await expect(page.locator('.opening-form-panel')).toHaveCount(0)
  await page.locator('.editor-room-list button').last().click()
  await button(page, es, 'Abrir catálogo', 'Open catalog').click(); await page.locator('.furniture-catalog-card').nth(6).click(); await button(page, es, 'Añadir mueble', 'Add furniture').click()
  await expect(page.locator('#furniture-catalog-title')).toHaveCount(0)
  await page.getByRole('button', { name: es ? /Volver al resumen/ : /Back to summary/ }).click(); await home(page, es)
  const original = JSON.parse(await json(page))
  await manage(page, es, 'Casa principal', 'rename')
  await page.locator('#managed-project-name').fill(' '); await button(page, es, 'Guardar nombre', 'Save name').click()
  await expect(page.locator('#managed-project-name')).toHaveAttribute('aria-invalid', 'true')
  await page.locator('#managed-project-name').fill('Mi casa')
  await page.getByRole('combobox', { name: es ? 'Idioma' : 'Language', exact: true }).selectOption(es ? 'en' : 'es')
  await expect(page.locator('#managed-project-name')).toHaveValue('Mi casa')
  await page.getByRole('combobox', { name: es ? 'Language' : 'Idioma', exact: true }).selectOption(es ? 'es' : 'en')
  await page.evaluate(() => sessionStorage.setItem('deny-put', 'yes'))
  await button(page, es, 'Guardar nombre', 'Save name').click()
  await expect(page.getByRole('alert')).toContainText(es ? 'No se pudo completar' : 'could not be completed')
  expect(JSON.parse(await json(page)).name).toBe('Casa principal')
  await page.evaluate(() => sessionStorage.removeItem('deny-put'))
  await button(page, es, 'Guardar nombre', 'Save name').click()
  await expect(page.locator('.project-manager')).toHaveCount(0)
  await expect(page.locator('.project-card')).toContainText('Mi casa')
  const renamed = await json(page), p = JSON.parse(renamed)
  expect(p.id).toBe(original.id); expect(p.rooms).toEqual(original.rooms); expect(p.openings).toEqual(original.openings); expect(p.furniture).toEqual(original.furniture)
  await manage(page, es, 'Mi casa', 'duplicate')
  await page.locator('#managed-project-name').fill('Versión B')
  await page.evaluate(() => sessionStorage.setItem('deny-add', 'yes'))
  await button(page, es, 'Crear copia', 'Create copy').click()
  await expect(page.getByRole('alert')).toBeVisible(); expect(await records(page)).toHaveLength(1)
  await page.evaluate(() => sessionStorage.removeItem('deny-add'))
  await button(page, es, 'Crear copia', 'Create copy').click()
  await expect(page.locator('.project-manager')).toHaveCount(0); await expect(page.locator('.project-card')).toHaveCount(2)
  const stored = await records(page), copy = JSON.parse(stored.find(record => record.id !== p.id)!.json)
  expect(stored.find(record => record.id === p.id)!.json).toBe(renamed)
  expect(copy.rooms.map((room: { id: string }) => room.id)).not.toEqual(p.rooms.map((room: { id: string }) => room.id))
  expect(copy.openings[0].roomId).toBe(copy.rooms[0].id)
  expect(Object.keys(copy.rooms[0].wallMaterials)).toContain(copy.openings[0].wallId)
  expect(copy.furniture[0].roomId).toBe(copy.rooms[1].id)
  await page.screenshot({ path: `test-results/projects-list-${info.project.name}.png`, fullPage: true })
  await manage(page, es, 'Versión B', 'remove')
  await expect(page.locator('.manager-confirmation')).toContainText('Versión B')
  await page.locator('.project-manager').screenshot({ path: `test-results/projects-delete-${info.project.name}.png` })
  await button(page, es, 'Cancelar', 'Cancel').click(); expect(await records(page)).toHaveLength(2)
  await manage(page, es, 'Versión B', 'remove')
  await page.evaluate(() => sessionStorage.setItem('deny-delete', 'yes'))
  await button(page, es, 'Sí, eliminar proyecto', 'Yes, delete project').click()
  await expect(page.getByRole('alert')).toBeVisible(); expect(await records(page)).toHaveLength(2)
  await page.evaluate(() => sessionStorage.removeItem('deny-delete'))
  await button(page, es, 'Sí, eliminar proyecto', 'Yes, delete project').click()
  await expect(page.locator('.project-manager')).toHaveCount(0); await expect(page.locator('.project-card')).toHaveCount(1)
  expect(await records(page)).toEqual([{ id: p.id, json: renamed }])
  await page.reload(); await page.getByRole('button', { name: es ? 'Abrir proyecto: Mi casa' : 'Open project: Mi casa', exact: true }).click()
  await expect(page.locator('.summary-room')).toHaveCount(2)
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await expect(page.locator('.furniture-list button')).toHaveCount(1); await expect(page.locator('.opening-list button')).toHaveCount(1)
  expect(await json(page)).toBe(renamed)
})

test('read failure, concurrent edits and missing projects never silently overwrite or recreate data', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await start(page, es); await home(page, es)
  await page.evaluate(() => sessionStorage.setItem('deny-get', 'yes'))
  await manage(page, es, 'Casa principal', 'rename')
  await expect(page.getByRole('alert')).toContainText(es ? 'No pudimos leer' : 'could not read')
  await page.evaluate(() => sessionStorage.removeItem('deny-get'))
  await button(page, es, 'Recargar proyecto', 'Reload project').click(); await expect(page.locator('#managed-project-name')).toBeVisible()
  await page.locator('#managed-project-name').fill('Nombre final')
  await externalChange(page, 'Cambio externo')
  const latest = await json(page)
  await button(page, es, 'Guardar nombre', 'Save name').click()
  await expect(page.getByRole('alert')).toContainText(es ? 'cambió' : 'changed')
  expect(await json(page)).toBe(latest)
  await page.locator('.project-manager').screenshot({ path: `test-results/projects-conflict-${info.project.name}.png` })
  await button(page, es, 'Recargar proyecto', 'Reload project').click()
  await expect(page.locator('.manager-source')).toHaveText('Cambio externo')
  await expect(page.locator('#managed-project-name')).toHaveValue('Nombre final')
  await button(page, es, 'Guardar nombre', 'Save name').click(); await expect(page.locator('.project-manager')).toHaveCount(0)
  expect(JSON.parse(await json(page)).rooms[0].floorMaterial.color).toBe('#112233')
  await manage(page, es, 'Nombre final', 'remove')
  await externalChange(page, 'Cambio después de confirmar')
  await button(page, es, 'Sí, eliminar proyecto', 'Yes, delete project').click()
  await expect(page.getByRole('alert')).toContainText(es ? 'cambió' : 'changed'); expect(await records(page)).toHaveLength(1)
  await button(page, es, 'Cancelar', 'Cancel').click()
  await page.reload()
  await manage(page, es, 'Cambio después de confirmar', 'duplicate')
  await externalChange(page, '', true)
  await button(page, es, 'Crear copia', 'Create copy').click()
  await expect(page.getByRole('alert')).toContainText(es ? 'ya no está disponible' : 'no longer available')
  expect(await records(page)).toHaveLength(0)
})

test('remembered 2D options and 3D camera survive reopening; failed saves keep the previous design', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await start(page, es); await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  const original = await json(page)
  await page.getByRole('checkbox', { name: es ? 'Cuadrícula' : 'Grid', exact: true }).uncheck()
  await page.getByRole('checkbox', { name: es ? /^Ajuste:/ : /^Snap:/ }).uncheck()
  await page.getByRole('button', { name: es ? 'Acercar' : 'Zoom in', exact: true }).click()
  expect(await json(page)).toBe(original)
  await page.evaluate(() => sessionStorage.setItem('deny-put', 'yes'))
  await button(page, es, 'Recordar opciones 2D', 'Remember 2D options').click()
  await expect(page.locator('.save-indicator')).toContainText(es ? 'no se guardó' : 'not saved')
  expect(await json(page)).toBe(original)
  await page.evaluate(() => sessionStorage.removeItem('deny-put'))
  await button(page, es, 'Recordar opciones 2D', 'Remember 2D options').click()
  await expect(page.locator('.save-indicator')).toContainText(es ? 'Diseño guardado' : 'Design saved')
  await expect.poll(async () => JSON.parse(await json(page)).viewSettings).toMatchObject({ grid: false, snap: false, zoom2d: 1.25 })
  const saved2d = await json(page)
  await page.reload(); await page.getByRole('button', { name: es ? 'Abrir proyecto: Casa principal' : 'Open project: Casa principal', exact: true }).click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await expect(page.getByRole('checkbox', { name: es ? 'Cuadrícula' : 'Grid', exact: true })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: es ? /^Ajuste:/ : /^Snap:/ })).not.toBeChecked()
  await expect(page.getByRole('status').filter({ hasText: es ? 'Diseño guardado' : 'Design saved' })).toBeVisible()
  await expect(page.locator('output')).toHaveText('125%')
  expect(await json(page)).toBe(saved2d)
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true')
  await button(page, es, 'Desde arriba', 'Top view').click()
  await button(page, es, 'Recordar cámara 3D', 'Remember 3D camera').click()
  await expect(page.locator('.save-indicator')).toContainText(es ? 'Diseño guardado' : 'Design saved')
  const saved = await json(page), p = JSON.parse(saved), before = JSON.parse(original)
  expect(p.rooms).toEqual(before.rooms); expect(p.openings).toEqual(before.openings); expect(p.furniture).toEqual(before.furniture)
  expect(p.viewSettings.camera3d.target.x).toBeCloseTo(2); expect(p.viewSettings.camera3d.position.y).toBeGreaterThan(p.viewSettings.camera3d.target.y + 5)
  await page.screenshot({ path: `test-results/projects-view-${info.project.name}.png`, fullPage: true })
  await page.reload(); await page.getByRole('button', { name: es ? 'Abrir proyecto: Casa principal' : 'Open project: Casa principal', exact: true }).click()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click(); await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
  await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true')
  expect(await json(page)).toBe(saved)
  // Read back the live restored OrbitControls camera through a second explicit save.
  await button(page, es, 'Recordar cámara 3D', 'Remember 3D camera').click()
  await expect(page.locator('.save-indicator')).toContainText(es ? 'Diseño guardado' : 'Design saved')
  const lastSaved = await json(page), live = JSON.parse(lastSaved).viewSettings.camera3d
  for (const field of ['position', 'target'] as const) for (const axis of ['x', 'y', 'z'] as const) expect(live[field][axis]).toBeCloseTo(p.viewSettings.camera3d[field][axis], 6)
  // Reopening the confirmed record clears a previous operation's transient error.
  await page.evaluate(() => sessionStorage.setItem('deny-put', 'yes'))
  await button(page, es, 'Recordar cámara 3D', 'Remember 3D camera').click()
  await expect(page.locator('.save-indicator')).toContainText(es ? 'no se guardó' : 'not saved')
  await page.getByRole('button', { name: es ? /Volver al plano 2D/ : /Back to 2D plan/ }).click()
  await page.getByRole('button', { name: es ? /Volver al resumen/ : /Back to summary/ }).click(); await home(page, es)
  await page.getByRole('button', { name: es ? 'Abrir proyecto: Casa principal' : 'Open project: Casa principal', exact: true }).click()
  await expect(page.locator('.save-indicator')).toContainText(es ? 'Diseño guardado' : 'Design saved')
  expect(await json(page)).toBe(lastSaved)
})
