import { test, expect, type Page } from '@playwright/test'

async function names(page: Page, language: 'es' | 'en', name = 'Casa de Carlos') {
  await page.getByRole('button', { name: language === 'es' ? 'Crear un proyecto' : 'Create a project' }).click()
  await page.getByLabel(language === 'es' ? 'Nombre del proyecto' : 'Project name').fill(name)
  await page.getByLabel(language === 'es' ? 'Nombre de la habitación' : 'Room name').fill('Dormitorio principal')
  await page.getByRole('button', { name: language === 'es' ? 'Continuar' : 'Continue', exact: true }).click()
}

test('create in cm, correct invalid inputs, change language, reopen after a new session', async ({ page, context }, testInfo) => {
  const spanish = testInfo.project.name === 'phone'
  const runtimeErrors: string[] = []
  page.on('pageerror', e => runtimeErrors.push(e.message))
  await page.goto('/')
  await page.getByRole('button', { name: spanish ? 'Crear un proyecto' : 'Create a project' }).click()
  await page.getByRole('button', { name: spanish ? 'Continuar' : 'Continue', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(2)
  await expect(page.getByLabel(spanish ? 'Nombre del proyecto' : 'Project name')).toBeFocused()
  await page.getByLabel(spanish ? 'Nombre del proyecto' : 'Project name').fill('Casa de Carlos')
  await page.getByLabel(spanish ? 'Nombre de la habitación' : 'Room name').fill('Dormitorio principal')
  await page.getByRole('button', { name: spanish ? 'Continuar' : 'Continue', exact: true }).click()
  await page.getByRole('radio', { name: spanish ? 'Centímetros (cm)' : 'Centimetres (cm)', exact: true }).check()
  await expect(page.locator('#width')).toHaveValue('400')
  await page.locator('#width').fill('420,5')
  await page.locator('#depth').fill('315')
  await page.locator('#height').fill('0')
  await page.getByRole('button', { name: spanish ? 'Crear y guardar' : 'Create and save', exact: true }).click()
  await expect(page.locator('#height')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#width')).toHaveValue('420,5')
  await page.locator('#height').fill('265')
  await page.getByRole('radio', { name: spanish ? 'Metros (m)' : 'Metres (m)', exact: true }).check()
  await expect(page.locator('#width')).toHaveValue('4.205')
  await expect(page.locator('#height')).toHaveValue('2.65')
  await page.getByRole('button', { name: spanish ? 'Atrás' : 'Back', exact: true }).click()
  await expect(page.locator('#projectName')).toHaveValue('Casa de Carlos')
  await page.getByRole('combobox').selectOption(spanish ? 'en' : 'es')
  await expect(page.locator('#roomName')).toHaveValue('Dormitorio principal')
  await page.getByRole('button', { name: spanish ? 'Continue' : 'Continuar', exact: true }).click()
  await expect(page.locator('#width')).toHaveValue('4.205')
  await page.screenshot({ path: `test-results/wizard-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: spanish ? 'Create and save' : 'Crear y guardar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Casa de Carlos', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dormitorio principal', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: spanish ? 'Room 4.205 m wide by 3.15 m deep' : 'Habitación de 4,205 m de ancho por 3,15 m de fondo' })).toBeVisible()
  await expect(page.getByText(spanish ? 'Saved on this device' : 'Guardado en este dispositivo', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/room-${testInfo.project.name}.png`, fullPage: true })
  // A separate page has no in-memory Zustand state from the creation session.
  const reopened = await context.newPage()
  await reopened.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.close()
  await reopened.goto('/')
  await reopened.getByRole('button', { name: /Casa de Carlos/ }).click()
  await expect(reopened.getByRole('heading', { name: 'Dormitorio principal' })).toBeVisible()
  await expect(reopened.getByText(spanish ? '2.65 m' : '2,65 m', { exact: true })).toBeVisible()
  await reopened.getByRole('button', { name: spanish ? 'Back to your projects' : 'Volver a tus proyectos' }).click()
  await names(reopened, spanish ? 'en' : 'es', 'Estudio')
  await reopened.getByRole('button', { name: spanish ? 'Create and save' : 'Crear y guardar', exact: true }).click()
  await reopened.getByRole('button', { name: spanish ? 'Back to your projects' : 'Volver a tus proyectos' }).click()
  await expect(reopened.getByRole('button', { name: /Casa de Carlos/ })).toBeVisible()
  await expect(reopened.getByRole('button', { name: /Estudio/ })).toBeVisible()
  await reopened.screenshot({ path: `test-results/projects-${testInfo.project.name}.png`, fullPage: true })
  expect(runtimeErrors).toEqual([])
})

test('failed save preserves entries, retries once and cancellation creates nothing', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'phone' ? 'es' : 'en'
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'projects' && !sessionStorage.getItem('allow-save')) throw new DOMException('Full', 'QuotaExceededError')
      return original.apply(this, args)
    }
  })
  await page.goto('/')
  await names(page, language)
  await page.locator('#width').fill('5,5')
  await page.getByRole('button', { name: language === 'es' ? 'Crear y guardar' : 'Create and save', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(language === 'es' ? 'No se pudo guardar' : 'Could not save')
  await expect(page.locator('#width')).toHaveValue('5,5')
  await page.evaluate(() => sessionStorage.setItem('allow-save', 'yes'))
  await page.getByRole('button', { name: language === 'es' ? 'Crear y guardar' : 'Create and save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Casa de Carlos' })).toBeVisible()
  await page.getByRole('button', { name: language === 'es' ? 'Volver a tus proyectos' : 'Back to your projects' }).click()
  await expect(page.getByRole('button', { name: /Casa de Carlos/ })).toHaveCount(1)
  await names(page, language, 'Cancelado')
  await page.getByRole('button', { name: language === 'es' ? 'Cancelar' : 'Cancel', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /Cancelado/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Casa de Carlos/ })).toHaveCount(1)
})

test('a failed list can be retried and unreadable records do not hide or replace valid projects', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'phone' ? 'es' : 'en'
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.getAll
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'projects' && !sessionStorage.getItem('allow-list')) throw new DOMException('Unavailable', 'UnknownError')
      return original.apply(this, args)
    }
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText(language === 'es' ? 'No pudimos leer' : 'We could not read')
  await page.evaluate(() => sessionStorage.setItem('allow-list', 'yes'))
  await page.getByRole('button', { name: language === 'es' ? 'Reintentar' : 'Try again', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await names(page, language)
  await page.getByRole('button', { name: language === 'es' ? 'Crear y guardar' : 'Create and save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Casa de Carlos' })).toBeVisible()
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('projects', 'readwrite')
      tx.objectStore('projects').add({ id: 'damaged', json: '{broken' })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(language === 'es' ? 'Se conservaron sin cambios' : 'kept unchanged')
  await page.getByRole('button', { name: /Casa de Carlos/ }).click()
  await expect(page.getByRole('heading', { name: 'Dormitorio principal' })).toBeVisible()
  const stored = await page.evaluate(() => new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, read = db.transaction('projects').objectStore('projects').get('damaged')
      read.onsuccess = () => { db.close(); resolve(read.result) }
      read.onerror = () => { db.close(); reject(read.error) }
    }
  }))
  expect(stored).toEqual({ id: 'damaged', json: '{broken' })
})
