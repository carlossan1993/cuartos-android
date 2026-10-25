import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { Dexie } from 'dexie'
import { createProject, createRectangularRoom } from '../domain/project'
import type { FurnitureItem } from '../domain/types'
import { furnitureFits } from '../furniture/geometry'
import { rotateFurniture } from '../furniture/rotation'
import { createProjectRepository } from '../storage/project-repository'
import { createProjectStore } from '../state/project-store'
import { saveFurnitureChange } from '../projects/save-furniture'
import { saveHistoryChange } from '../projects/save-project-change'

const room = createRectangularRoom({ id: 'room', name: 'Sala', width: 4, depth: 3 })
const item: FurnitureItem = { id: 'sofa', roomId: 'room', catalogId: 'sofa', position: { x: 3.6, y: 1.5 }, rotation: 90, dimensions: { width: 1.8, depth: .7, height: .8 }, materialOverrides: { body: { color: '#03038c' } } }

describe('provisional rotation without modifying saved furniture', () => {
  it.each([-1, 1] as const)('crosses an invalid intermediate angle then fits a half-turn (%s)', direction => {
    const before = JSON.stringify(item), first = rotateFurniture(null, item, direction)
    expect(furnitureFits(item, room)).toBe(true)
    expect(furnitureFits(first.candidate, room)).toBe(false)
    const second = rotateFurniture(first, item, direction)
    expect(furnitureFits(second.candidate, room)).toBe(true)
    expect(second.candidate.rotation).toBe(270)
    expect(second.candidate.position).toEqual(item.position)
    expect(second.original).toBe(item)
    expect(JSON.stringify(item)).toBe(before)
  })
  it('wraps in both directions, reverses turns and returns exactly after a full turn', () => {
    for (const direction of [-1, 1] as const) {
      let draft = rotateFurniture(null, item, direction)
      expect(rotateFurniture(draft, item, direction === 1 ? -1 : 1).candidate).toEqual(item)
      for (let i = 1; i < 4; i++) draft = rotateFurniture(draft, item, direction)
      expect(draft.candidate).toEqual(item)
    }
  })
  it('persists only the final valid angle, creates one undo step and reopens unchanged data', async () => {
    const name = `rotation-${crypto.randomUUID()}`, repo = createProjectRepository(name), store = createProjectStore()
    const project = { ...createProject({ id: 'p', name: 'Antes de actualizar', language: 'es', now: '2026-10-25T12:00:00.000Z' }), rooms: [room], furniture: [item] }
    try {
      await repo.create(project); store.getState().loadProject(project)
      const first = rotateFurniture(null, item, 1)
      await expect(saveFurnitureChange({ type: 'update', item: first.candidate }, { repository: repo, store })).rejects.toMatchObject({ code: 'furniture_outside_room' })
      expect(await repo.get(project.id)).toEqual(project)
      const final = rotateFurniture(first, item, 1)
      await saveFurnitureChange({ type: 'update', item: final.candidate }, { repository: repo, store })
      const saved = await repo.get(project.id)
      expect(saved).toEqual({ ...project, updatedAt: saved.updatedAt, furniture: [final.candidate] })
      await saveHistoryChange('undo', { repository: repo, store })
      expect((await repo.get(project.id)).furniture).toEqual([item])
      repo.close()
      const reopened = createProjectRepository(name)
      try { expect((await reopened.get(project.id)).furniture).toEqual([item]) } finally { reopened.close() }
    } finally { repo.close(); await Dexie.delete(name) }
  })
})
