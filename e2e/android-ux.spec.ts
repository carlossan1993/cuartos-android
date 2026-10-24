import { expect, test, type Page } from '@playwright/test'

interface Bridge {
  callbacks: Record<string, () => void>; exits: number; holdCommit: boolean; commits: (() => void)[]; holdExport: boolean; finishExport?: () => void
}
const button = (page: Page, es: boolean, a: string, b: string) => page.getByRole('button', { name: es ? a : b, exact: true })
async function native(page: Page) {
  await page.addInitScript(() => {
    const state: Bridge = { callbacks: {}, exits: 0, holdCommit: false, commits: [], holdExport: false }
    let next = 0
    Object.assign(window, { navBridge: state, androidBridge: {}, Capacitor: {
      PluginHeaders: [
        { name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }, { name: 'exitApp', rtype: 'promise' }] },
        { name: 'Filesystem', methods: ['writeFile', 'readdir', 'rmdir'].map(name => ({ name, rtype: 'promise' })) },
        { name: 'CuartosDocument', methods: [{ name: 'save', rtype: 'promise' }] },
      ],
      nativeCallback: (_plugin: string, _method: string, _options: unknown, callback: () => void) => { const id = `back-${++next}`; state.callbacks[id] = callback; return id },
      nativePromise: async (plugin: string, method: string, options: Record<string, string>) => {
        if (plugin === 'App' && method === 'removeListener') { delete state.callbacks[options.callbackId]; return {} }
        if (plugin === 'App' && method === 'exitApp') { state.exits++; return {} }
        if (plugin === 'Filesystem' && method === 'readdir') return { files: [] }
        if (plugin === 'Filesystem' && method === 'writeFile') return { uri: `file:///cache/${options.path}` }
        if (plugin === 'CuartosDocument') {
          if (state.holdExport) return new Promise(resolve => { state.finishExport = () => resolve({ status: 'saved' }) })
          return { status: 'saved' }
        }
        throw Error(`Unexpected ${plugin}.${method}`)
      },
    } })
    // Delay the application's commit notification after IDB commits, without
    // delaying requests (which would make an IDB transaction inactive).
    const transaction = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (...args) {
      const tx = transaction.apply(this, args)
      tx.addEventListener('complete', event => {
        if (state.holdCommit && tx.mode === 'readwrite' && tx.objectStoreNames.contains('projects')) { event.stopImmediatePropagation(); state.commits.push(() => tx.dispatchEvent(new Event('complete'))) }
      }, { capture: true })
      return tx
    }
  })
}
async function back(page: Page) {
  await page.evaluate(() => Object.values((window as unknown as { navBridge: Bridge }).navBridge.callbacks).forEach(callback => callback()))
}
async function hold(page: Page) { await page.evaluate(() => { (window as unknown as { navBridge: Bridge }).navBridge.holdCommit = true }) }
async function release(page: Page) { await page.evaluate(() => { const state = (window as unknown as { navBridge: Bridge }).navBridge; state.holdCommit = false; state.commits.splice(0).forEach(finish => finish()) }) }
async function saved(page: Page): Promise<string> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onsuccess = () => { const db = request.result, read = db.transaction('projects').objectStore('projects').getAll(); read.onsuccess = () => { db.close(); resolve(read.result[0].json) }; read.onerror = () => reject(read.error) }; request.onerror = () => reject(request.error)
  }))
}
async function start(page: Page, es: boolean, useNative = false) {
  if (useNative) await native(page)
  await page.goto('/')
  if (useNative) await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { navBridge: Bridge }).navBridge.callbacks).length)).toBe(1)
  await button(page, es, 'Crear un proyecto', 'Create a project').click()
  await page.locator('#projectName').fill('Cuartos responsive'); await page.locator('#roomName').fill('Sala')
  await button(page, es, 'Continuar', 'Continue').click()
  await button(page, es, 'Crear y guardar', 'Create and save').click()
  await expect(page.locator('.project-summary')).toBeVisible()
}

test('Android Back preserves wizard drafts, closes panels, waits for commit and exits only from home', async ({ page }, info) => {
  const es = info.project.name === 'phone', errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await native(page); await page.goto('/')
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { navBridge: Bridge }).navBridge.callbacks).length)).toBe(1)
  await button(page, es, 'Crear un proyecto', 'Create a project').click(); await page.locator('#projectName').fill('Atrás'); await page.locator('#roomName').fill('Sala')
  await button(page, es, 'Continuar', 'Continue').click(); await page.locator('#width').fill('4.7')
  await back(page); await expect(page.locator('#projectName')).toHaveValue('Atrás')
  await button(page, es, 'Continuar', 'Continue').click(); await expect(page.locator('#width')).toHaveValue('4.7')
  await hold(page); await button(page, es, 'Crear y guardar', 'Create and save').click()
  await expect(page.locator('.creation form')).toHaveAttribute('aria-busy', 'true'); await back(page); await expect(page.locator('.creation')).toBeVisible()
  await release(page); await expect(page.locator('.project-summary')).toBeVisible()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  const original = await saved(page)
  await button(page, es, 'Añadir puerta', 'Add door').click(); await page.locator('#opening-width').fill('1.1')
  await back(page); await expect(page.getByRole('dialog')).toHaveCount(0); expect(await saved(page)).toBe(original)
  await button(page, es, 'Añadir puerta', 'Add door').click(); await hold(page)
  await button(page, es, 'Guardar abertura', 'Save opening').click()
  await expect(page.locator('.opening-form-panel form')).toHaveAttribute('aria-busy', 'true')
  await back(page); await back(page); await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: es ? 'Cerrar panel' : 'Close panel' })).toBeDisabled()
  await release(page); await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.history-count')).toContainText(es ? '1 para deshacer' : '1 to undo')
  await button(page, es, 'Abrir catálogo', 'Open catalog').click(); await page.locator('.furniture-catalog-card').nth(4).click(); await button(page, es, 'Añadir mueble', 'Add furniture').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const confirmed = await saved(page), p = JSON.parse(confirmed), item = p.furniture[0], surface = page.locator('.canvas-surface')
  await surface.scrollIntoViewIfNeeded()
  const box = (await surface.boundingBox())!, pad = Math.min(64, box.width * .18, box.height * .18), scale = Math.min((box.width - 2 * pad) / 4.7, (box.height - 2 * pad) / 3)
  const point = { x: box.x + box.width / 2 + (item.position.x - 2.35) * scale, y: box.y + box.height / 2 + (item.position.y - 1.5) * scale }
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + scale * .3, point.y, { steps: 5 })
  await back(page); await page.mouse.up(); expect(await saved(page)).toBe(confirmed)
  await expect(page.locator('.history-count')).toContainText(es ? '2 para deshacer' : '2 to undo')
  await button(page, es, 'Ver habitación 3D', 'View room in 3D').click(); await expect(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true')
  await back(page); await expect(page.locator('.canvas-surface canvas')).toBeVisible(); expect(await saved(page)).toBe(confirmed)
  await back(page); await expect(page.locator('.project-summary')).toBeVisible(); expect(await saved(page)).toBe(confirmed)
  await back(page); await expect(page.locator('.hero')).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { navBridge: Bridge }).navBridge.exits)).toBe(0)
  await back(page); expect(await page.evaluate(() => (window as unknown as { navBridge: Bridge }).navBridge.exits)).toBe(1)
  expect(errors).toEqual([])
})

test('responsive editing panel retains draft and language, keeps actions visible and restores focus', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await start(page, es); await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  const original = await saved(page), open = button(page, es, 'Editar acabados', 'Edit finishes')
  await open.click(); const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible(); await expect(page.locator('#finish-form-title')).toBeFocused()
  await page.locator('#finish-color').fill('#03038c')
  const sizes = es ? [{ width: 393, height: 851 }, { width: 851, height: 393 }, { width: 320, height: 640 }] : [{ width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 640, height: 320 }]
  for (const [index, size] of sizes.entries()) {
    await page.setViewportSize(size)
    await expect.poll(() => dialog.evaluate(element => element.getBoundingClientRect().bottom <= innerHeight + 1)).toBe(true)
    await expect(page.locator('#finish-color')).toHaveValue('#03038c')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    await page.locator('#finish-color').focus()
    await expect.poll(async () => { const input = (await page.locator('#finish-color').boundingBox())!, footer = (await dialog.locator('.form-actions').boundingBox())!; return input.y + input.height <= footer.y + 1 }).toBe(true)
    await expect(button(page, es, 'Guardar acabado', 'Save finish')).toBeInViewport()
    await page.screenshot({ path: `test-results/android-panel-${info.project.name}-${index}.png`, fullPage: false })
  }
  const language = dialog.locator('#panel-language')
  await language.selectOption(es ? 'en' : 'es'); await expect(page.locator('#finish-color')).toHaveValue('#03038c')
  await language.selectOption(es ? 'es' : 'en')
  // Native dialog traps keyboard focus and hides the background from accessibility.
  await button(page, es, 'Guardar acabado', 'Save finish').focus(); await page.keyboard.press('Tab')
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Shift+Tab'); await expect(button(page, es, 'Guardar acabado', 'Save finish')).toBeFocused()
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(open).toBeFocused()
  expect(await saved(page)).toBe(original)
  await page.setViewportSize(sizes[0]); await page.locator('#editor-title').focus()
  await button(page, es, 'Abrir catálogo', 'Open catalog').evaluate((element: HTMLButtonElement) => element.click())
  const targetSizes = await page.getByRole('dialog').locator('button, select').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({ w: element.getBoundingClientRect().width, h: element.getBoundingClientRect().height })))
  expect(targetSizes.every(size => size.w >= 48 && size.h >= 48)).toBe(true)
  await page.screenshot({ path: `test-results/android-catalog-${info.project.name}.png`, fullPage: false })
  await page.getByRole('button', { name: es ? 'Cerrar panel' : 'Close panel' }).click()
  await expect(button(page, es, 'Abrir catálogo', 'Open catalog')).toBeFocused()
})

test('native Back is consumed during an export or project management transaction', async ({ page }, info) => {
  const es = info.project.name === 'phone'
  await start(page, es, true)
  const original = await saved(page)
  await page.evaluate(() => { (window as unknown as { navBridge: Bridge }).navBridge.holdExport = true })
  await button(page, es, 'Guardar archivo', 'Save file').click()
  await expect(page.locator('.file-panel')).toHaveAttribute('aria-busy', 'true'); await back(page); await expect(page.locator('.project-summary')).toBeVisible()
  expect(await saved(page)).toBe(original)
  await page.evaluate(() => { (window as unknown as { navBridge: Bridge }).navBridge.finishExport?.() })
  await expect(page.locator('.file-panel')).toHaveAttribute('aria-busy', 'false')
  await back(page); await button(page, es, 'Renombrar', 'Rename').click()
  await expect(page.locator('#managed-project-name')).toBeEditable(); await page.locator('#managed-project-name').fill('Nombre confirmado')
  await hold(page); await button(page, es, 'Guardar nombre', 'Save name').click()
  await expect(page.locator('.project-manager')).toHaveAttribute('aria-busy', 'true'); await back(page); await expect(page.locator('.project-manager')).toBeVisible()
  await release(page); await expect(page.locator('.project-manager')).toHaveCount(0)
  await expect(page.locator('.project-card strong')).toHaveText('Nombre confirmado')
  expect(await page.evaluate(() => (window as unknown as { navBridge: Bridge }).navBridge.exits)).toBe(0)
})
