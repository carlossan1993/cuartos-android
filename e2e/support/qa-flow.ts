import { expect, type Page } from '@playwright/test'
import type { Project } from '../../src/domain/types.ts'

export type Shape = 'rectangle' | 'l' | 'connected'
export const button = (page: Page, es: boolean, spanish: string, english: string) => page.getByRole('button', { name: es ? spanish : english, exact: true })
export async function records(page: Page): Promise<{ id: string; json: string }[]> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('cuartos-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, read = db.transaction('projects').objectStore('projects').getAll()
      read.onsuccess = () => { db.close(); resolve(read.result) }
      read.onerror = () => { db.close(); reject(read.error) }
    }
  }))
}
export async function saved(page: Page, name: string): Promise<Project> {
  const projects = (await records(page)).map(record => JSON.parse(record.json) as Project)
  const project = projects.find(project => project.name === name)
  if (!project) throw new Error(`Missing confirmed project: ${name}`)
  return project
}
export const design = (project: Project) => ({ rooms: project.rooms, openings: project.openings, furniture: project.furniture })

/** Uses only the public UI and reads confirmed storage; no seeded data or bridge mocks. */
export async function createDesign(page: Page, es: boolean, shape: Shape, name: string) {
  await page.locator('#language').selectOption(es ? 'es' : 'en')
  await button(page, es, 'Crear un proyecto', 'Create a project').click()
  await page.locator('#projectName').fill(name); await page.locator('#roomName').fill('Sala')
  await page.locator(`input[name="shape"][value="${shape}"]`).check()
  if (shape === 'connected') await page.locator('#room2Name').fill('Estudio')
  await button(page, es, 'Continuar', 'Continue').click()
  await page.locator('#width').fill('5'); await page.locator('#depth').fill('4')
  if (shape === 'l') { await page.locator('#cutWidth').fill('2'); await page.locator('#cutDepth').fill('2') }
  await button(page, es, 'Crear y guardar', 'Create and save').click()
  await expect(page.locator('.project-summary')).toBeVisible()
  await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
  await expect(page.locator('.canvas-surface canvas')).toBeVisible()
  await button(page, es, 'Añadir puerta', 'Add door').click()
  await button(page, es, 'Guardar abertura', 'Save opening').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await button(page, es, 'Editar acabados', 'Edit finishes').click()
  await page.locator('.finish-presets').getByRole('button', { name: es ? 'Azul profundo' : 'Deep blue', exact: true }).click()
  await button(page, es, 'Guardar acabado', 'Save finish').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await button(page, es, 'Abrir catálogo', 'Open catalog').click()
  await expect(page.locator('.furniture-catalog-card')).toHaveCount(16)
  await page.locator('.furniture-catalog-card').nth(4).click()
  await button(page, es, 'Añadir mueble', 'Add furniture').click()
  await expect(page.locator('.furniture-list button')).toHaveCount(1)
  const project = await saved(page, name)
  expect(project.rooms).toHaveLength(shape === 'connected' ? 2 : 1)
  expect(project.rooms[0].polygon).toHaveLength(shape === 'l' ? 6 : 4)
  expect(project.rooms[0].floorMaterial.color).toBe('#03038c')
  expect(project.openings).toHaveLength(1); expect(project.furniture[0].catalogId).toBe('chair')
  return project
}
