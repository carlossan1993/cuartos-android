import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { describe, expect, it } from 'vitest'
import { serializeProject } from '../domain/project'
import { initialRoomDraft, projectFromRoomDraft } from '../projects/room-draft'
import { saveHistoryChange, saveProjectChange } from '../projects/save-project-change'
import { createProjectStore } from '../state/project-store'
import { shareProjectData } from '../state/share-project-data'
import { createSaveStatus } from '../state/save-status'
import { createProjectRepository } from '../storage/project-repository'

const now = () => new Date('2026-10-24T12:00:00Z')
function fixture() {
  let id = 0
  return projectFromRoomDraft({ ...initialRoomDraft, shape: 'connected', projectName: 'Casa', roomName: 'Sala', room2Name: 'Estudio' }, 'es', { now, id: () => `id-${++id}` })
}

describe('immutable project sharing', () => {
  it('preserves exact serialized key order, deletions, nulls and array order', () => {
    const previous = { nested: { a: 1, b: 2 }, removed: true, list: [1, 2], nullable: null }
    const next = { list: [2, 1], nested: { b: 2, a: 1 }, nullable: null }
    const shared = shareProjectData<unknown>(previous, next)
    expect(JSON.stringify(shared)).toBe(JSON.stringify(next))
    expect(JSON.stringify(previous)).toBe('{"nested":{"a":1,"b":2},"removed":true,"list":[1,2],"nullable":null}')
    expect(shareProjectData(previous, structuredClone(previous))).toBe(previous)
    expect(shareProjectData<unknown>([1], { a: 1 })).toEqual({ a: 1 })
  })
  it('reuses entities by ID across insertion, removal and reordering without sharing changed data', () => {
    const previous = [{ id: 'a', value: { color: '#03038c' } }, { id: 'b', value: { color: '#ffffff' } }]
    const reordered = shareProjectData(previous, [structuredClone(previous[1]), structuredClone(previous[0])])
    expect(reordered[0]).toBe(previous[1]); expect(reordered[1]).toBe(previous[0])
    const edited = shareProjectData(previous, [{ ...previous[0], value: { color: '#000000' } }, { id: 'new', value: { color: '#ffffff' } }])
    expect(edited[0]).not.toBe(previous[0]); expect(edited[0].value).not.toBe(previous[0].value)
    expect(edited[1].id).toBe('new'); expect(previous[0].value.color).toBe('#03038c')
  })
  it('publishes frozen, shared branches only after a real CAS commit and supports consecutive saves/undo/redo', async () => {
    const name = `sharing-${crypto.randomUUID()}`, repo = createProjectRepository(name), raw = new Dexie(name), store = createProjectStore(), p = fixture(), status = createSaveStatus()
    raw.version(1).stores({ projects: 'id' })
    const dependencies = { store, repository: repo, now, status }
    try {
      await repo.create(p); store.getState().loadProject(p)
      const first = store.getState().project!
      await saveProjectChange(state => state.setViewSettings({ ...state.project!.viewSettings, grid: false }), dependencies)
      const prefs = store.getState().project!
      expect(prefs.rooms).toBe(first.rooms); expect(prefs.furniture).toBe(first.furniture); expect(prefs.openings).toBe(first.openings)
      expect(prefs.viewSettings).not.toBe(first.viewSettings)
      await saveProjectChange(state => {
        const { floorMaterial: _, ...rest } = state.project!.rooms[0]
        state.updateRoom({ floorMaterial: { color: '#03038c', textureId: 'future-texture' }, ...rest })
      }, dependencies)
      const edited = store.getState().project!
      expect(edited.rooms[0]).not.toBe(prefs.rooms[0]); expect(edited.rooms[0].polygon).toBe(prefs.rooms[0].polygon)
      expect(edited.rooms[1]).toBe(prefs.rooms[1]); expect(edited.viewSettings).toBe(prefs.viewSettings)
      expect(Object.isFrozen(edited.rooms[0].floorMaterial)).toBe(true)
      expect((await raw.table('projects').get(p.id)).json).toBe(serializeProject(edited))
      await saveProjectChange(state => state.renameProject('Nuevo'), dependencies)
      await saveProjectChange(state => state.updateRoom({ ...state.project!.rooms[0], height: 3.2 }), dependencies)
      await saveHistoryChange('undo', dependencies)
      await saveHistoryChange('undo', dependencies)
      expect(store.getState().project!.rooms).toEqual(first.rooms)
      expect(store.getState().project!.viewSettings.grid).toBe(false)
      await saveHistoryChange('redo', dependencies)
      expect(store.getState().project!.rooms[0].floorMaterial.textureId).toBe('future-texture')
      expect((await raw.table('projects').get(p.id)).json).toBe(serializeProject(store.getState().project!))
      const before = store.getState().project!, history = store.getState().history
      await expect(saveProjectChange(state => state.renameProject('Failed'), { ...dependencies, repository: { replace: async () => { throw Error('disk full') } } })).rejects.toThrow('disk full')
      expect(store.getState().project).toBe(before); expect(store.getState().history).toBe(history)
      store.getState().loadProject(before)
      expect(store.getState().project!.rooms).not.toBe(before.rooms)
      expect(first.viewSettings.grid).toBe(true)
    } finally { repo.close(); raw.close(); await Dexie.delete(name) }
  })
})
