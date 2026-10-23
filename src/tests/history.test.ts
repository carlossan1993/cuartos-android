import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { serializeProject } from '../domain/project'
import type { Project } from '../domain/types'
import { getWalls } from '../geometry/rooms'
import { projectFromRoomDraft, initialRoomDraft } from '../projects/room-draft'
import { saveProjectChange, saveHistoryChange } from '../projects/save-project-change'
import { saveOpeningChange } from '../projects/save-opening'
import { saveFinishChange } from '../projects/save-finish'
import { saveFurnitureChange } from '../projects/save-furniture'
import { createProjectStore } from '../state/project-store'
import { createSaveStatus } from '../state/save-status'
import { designSnapshot, emptyHistory, historyCandidate, HISTORY_LIMITS, recordHistory } from '../state/project-history'
import { createProjectRepository } from '../storage/project-repository'

const now = () => new Date('2026-10-24T12:00:00.000Z')
function fixture(shape: 'rectangle' | 'l' | 'connected' = 'rectangle'): Project {
  let n = 0
  const p = projectFromRoomDraft({ ...initialRoomDraft, shape, projectName: 'Casa 🏠', roomName: 'Sala', room2Name: 'Estudio' }, 'es', { now, id: () => `id-${++n}` })
  return { ...p, furniture: [{ id: 'legacy', roomId: p.rooms[0].id, catalogId: 'future-piece', position: { x: -2, y: -3 }, rotation: 37, dimensions: { width: .61, depth: .72, height: .9 }, materialOverrides: { body: { color: '#03038c', textureId: 'future-texture' } } }] }
}
const databases: string[] = []
afterEach(async () => { for (const name of databases.splice(0)) await Dexie.delete(name) })
async function setup(shape: 'rectangle' | 'l' | 'connected' = 'rectangle') {
  const name = `history-${crypto.randomUUID()}`, repo = createProjectRepository(name), store = createProjectStore(), status = createSaveStatus(), p = fixture(shape)
  databases.push(name); await repo.create(p); store.getState().loadProject(p)
  return { name, repo, store, p, dependencies: { store, status, repository: repo, now } }
}
const finish = (p: Project, color: string) => ({ ...p, rooms: [{ ...p.rooms[0], floorMaterial: { color } }, ...p.rooms.slice(1)] })

describe('confirmed semantic history', () => {
  it.each(['rectangle', 'l', 'connected'] as const)('cycles openings, finishes, furniture and cascades with exact references on %s', async shape => {
    const { repo, store, p, dependencies } = await setup(shape)
    try {
      const states = [designSnapshot(p)], room = p.rooms[0]
      const remember = () => states.push(designSnapshot(store.getState().project!))
      const opening = { id: 'door', roomId: room.id, wallId: getWalls(room)[0].id, type: 'door' as const, offset: .2, width: .8, height: 2, sillHeight: 0 }
      await saveOpeningChange({ type: 'add', opening }, dependencies); remember()
      await saveOpeningChange({ type: 'update', opening: { ...opening, width: .9 } }, dependencies); remember()
      await saveFinishChange({ roomId: room.id, target: { kind: 'floor' }, material: { color: '#03038c', textureId: 'future-texture' } }, dependencies); remember()
      await saveFurnitureChange({ type: 'add', id: 'chair', catalogId: 'chair', roomId: room.id, snap: true }, dependencies); remember()
      const chair = store.getState().project!.furniture.find(item => item.id === 'chair')!
      await saveFurnitureChange({ type: 'update', item: { ...chair, rotation: -90 } }, dependencies); remember()
      await saveFurnitureChange({ type: 'duplicate', id: 'copy', sourceId: 'chair', snap: false }, dependencies); remember()
      await saveFurnitureChange({ type: 'remove', id: 'chair' }, dependencies); remember()
      await saveOpeningChange({ type: 'remove', id: opening.id }, dependencies); remember()
      await saveProjectChange(state => state.removeRoom(room.id), dependencies); remember()
      expect(store.getState().history.cursor).toBe(states.length - 1)
      for (let i = states.length - 2; i >= 0; i--) {
        await saveHistoryChange('undo', dependencies)
        const active = store.getState().project!
        expect(designSnapshot(active)).toBe(states[i]); expect(await repo.get(p.id)).toEqual(active)
        expect(active.id).toBe(p.id); expect(active.createdAt).toBe(p.createdAt); expect(active.schemaVersion).toBe(1)
        expect(Object.isFrozen(active.furniture)).toBe(true)
      }
      for (let i = 1; i < states.length; i++) { await saveHistoryChange('redo', dependencies); expect(designSnapshot(store.getState().project!)).toBe(states[i]) }
      await expect(saveHistoryChange('redo', dependencies)).rejects.toMatchObject({ code: 'unavailable' })
    } finally { repo.close() }
  })
  it('branches only after a successful design edit; no-ops, preferences and invalid changes keep redo', async () => {
    const { repo, store, dependencies } = await setup()
    try {
      await saveProjectChange(state => state.updateRoom(finish(state.project!, '#111111').rooms[0]), dependencies)
      await saveProjectChange(state => state.updateRoom(finish(state.project!, '#222222').rooms[0]), dependencies)
      await saveHistoryChange('undo', dependencies)
      const previous = store.getState().project, history = store.getState().history, replace = vi.fn(async () => {})
      await saveProjectChange(state => state.updateRoom(state.project!.rooms[0]), { ...dependencies, repository: { replace }, now: () => new Date('2030-01-01') })
      expect(store.getState().project).toBe(previous); expect(store.getState().history).toBe(history); expect(replace).not.toHaveBeenCalled()
      await expect(saveProjectChange(state => state.updateRoom({ ...state.project!.rooms[0], height: -1 }), dependencies)).rejects.toBeDefined()
      await expect(saveProjectChange(state => state.removeFurniture('legacy'), { ...dependencies, repository: { replace: async () => { throw Error('full') } } })).rejects.toBeDefined()
      expect(store.getState().history).toBe(history)
      await saveProjectChange(state => state.setViewSettings({ ...state.project!.viewSettings, grid: false }), dependencies)
      expect(store.getState().history).toBe(history)
      await saveHistoryChange('redo', dependencies)
      expect(store.getState().project!.viewSettings.grid).toBe(false)
      await saveHistoryChange('undo', dependencies)
      await saveProjectChange(state => state.removeFurniture('legacy'), dependencies)
      expect(store.getState().history.entries).toHaveLength(2); expect(store.getState().history.cursor).toBe(2)
      await expect(saveHistoryChange('redo', dependencies)).rejects.toMatchObject({ code: 'unavailable' })
    } finally { repo.close() }
  })
  it('treats identical imported properties in a different key order as a no-op', async () => {
    const { repo, store, dependencies } = await setup()
    try {
      const before = store.getState().project, replace = vi.fn(async () => {})
      await saveProjectChange(state => {
        const { floorMaterial, ...other } = state.project!.rooms[0]
        state.updateRoom({ floorMaterial, ...other })
      }, { ...dependencies, repository: { replace } })
      expect(replace).not.toHaveBeenCalled(); expect(store.getState().project).toBe(before)
      expect(store.getState().history.entries).toHaveLength(0)
    } finally { repo.close() }
  })
  it('publishes neither project nor cursor before commit; retries failures without a new entry', async () => {
    const { repo, store, dependencies } = await setup()
    try {
      await saveProjectChange(state => state.removeFurniture('legacy'), dependencies)
      const before = store.getState().project, history = store.getState().history
      let resolve!: () => void
      const operation = saveHistoryChange('undo', { ...dependencies, repository: { replace: () => new Promise<void>(r => { resolve = r }) } })
      expect(store.getState().project).toBe(before); expect(store.getState().history).toBe(history); expect(dependencies.status.getState().phase).toBe('saving')
      await expect(saveHistoryChange('undo', dependencies)).rejects.toMatchObject({ code: 'busy' })
      await expect(saveProjectChange(state => state.removeRoom(state.project!.rooms[0].id), dependencies)).rejects.toMatchObject({ code: 'busy' })
      expect(() => store.getState().renameProject('Unsafe')).toThrow()
      resolve(); await operation
      expect(store.getState().history.cursor).toBe(0); expect(store.getState().pending).toBe(null)
      const undone = store.getState().project, cursor = store.getState().history
      await expect(saveHistoryChange('redo', { ...dependencies, repository: { replace: async () => { throw new DOMException('Full', 'QuotaExceededError') } } })).rejects.toBeDefined()
      expect(store.getState().project).toBe(undone); expect(store.getState().history).toBe(cursor); expect(dependencies.status.getState().phase).toBe('error')
      // The mock commit above did not touch IDB; restore its matching state for a real transaction.
      await repo.replace(undone!, before!)
      await saveHistoryChange('redo', dependencies)
      expect(store.getState().history.entries).toHaveLength(1); expect(store.getState().history.cursor).toBe(1)
      expect(await repo.get(before!.id)).toEqual(store.getState().project)
    } finally { repo.close() }
  })
  it.each(['conflict', 'missing', 'unreadable', 'future'] as const)('preserves local history and the external %s record during undo', async failure => {
    const { name, repo, store, dependencies } = await setup(), raw = new Dexie(name)
    raw.version(1).stores({ projects: 'id' })
    try {
      await saveProjectChange(state => state.removeFurniture('legacy'), dependencies)
      const before = store.getState().project!, history = store.getState().history
      let external: { id: string; json: string } | undefined
      if (failure === 'missing') await raw.table('projects').delete(before.id)
      else { external = { id: before.id, json: failure === 'conflict' ? serializeProject({ ...before, name: 'External' }) : failure === 'future' ? JSON.stringify({ ...before, schemaVersion: 999 }) : '{broken' }; await raw.table('projects').put(external) }
      await expect(saveHistoryChange('undo', dependencies)).rejects.toMatchObject({ code: failure === 'future' ? 'unreadable' : failure })
      expect(store.getState().project).toBe(before); expect(store.getState().history).toBe(history)
      expect(await raw.table('projects').get(before.id)).toEqual(external)
      if (failure === 'conflict') { store.getState().loadProject(await repo.get(before.id)); expect(store.getState().history.cursor).toBe(0); expect(store.getState().project!.name).toBe('External') }
    } finally { repo.close(); raw.close() }
  })
  it.each(['close', 'load', 'import', 'new'] as const)('clears a session on %s and ignores late completion even for the same project ID', async action => {
    const { repo, store, p, dependencies } = await setup()
    try {
      await saveProjectChange(state => state.removeFurniture('legacy'), dependencies)
      let resolve!: () => void
      const operation = saveHistoryChange('undo', { ...dependencies, repository: { replace: () => new Promise<void>(r => { resolve = r }) } })
      if (action === 'close') store.getState().closeProject()
      else if (action === 'load') store.getState().loadProject(p)
      else if (action === 'import') store.getState().importProject(serializeProject(p))
      else store.getState().newProject('Other', 'en')
      const active = store.getState().project
      resolve(); await operation
      expect(store.getState().project).toBe(active); expect(store.getState().history).toEqual(emptyHistory()); expect(store.getState().pending).toBe(null)
    } finally { repo.close() }
  })
  it('uses a monotonic timestamp when undoing an imported future-dated design', async () => {
    const { repo, store, dependencies } = await setup()
    try {
      await saveProjectChange(state => state.removeFurniture('legacy'), { ...dependencies, now: () => new Date('2035-01-01') })
      await saveHistoryChange('undo', { ...dependencies, now: () => new Date('2020-01-01') })
      expect(store.getState().project!.updatedAt).toBe('2035-01-01T00:00:00.000Z')
      expect(await repo.get(store.getState().project!.id)).toEqual(store.getState().project)
    } finally { repo.close() }
  })
})

describe('history bounds', () => {
  it('retains only the 50 most recent actions without skipping the boundary', () => {
    let p = fixture(), history = emptyHistory()
    for (let i = 0; i < 55; i++) { const next = finish(p, `#${(i + 1).toString(16).padStart(6, '0')}`); history = recordHistory(history, p, next); p = next }
    expect(history.entries).toHaveLength(HISTORY_LIMITS.actions); expect(history.truncated).toBe(true)
    for (let i = 0; i < 50; i++) { const next = historyCandidate(p, history, 'undo', now); p = next.project; history = next.history }
    expect(p.rooms[0].floorMaterial.color).toBe('#000005')
    expect(() => historyCandidate(p, history, 'undo', now)).toThrow()
  })
  it('bounds string bytes, discards redo on a branch and treats oversized actions as a barrier', () => {
    const p = fixture(), a = finish(p, '#111111'), b = finish(p, '#222222'), c = finish(p, '#333333'), size = 2 * (designSnapshot(p).length + designSnapshot(a).length)
    let history = recordHistory(emptyHistory(), p, a, { actions: 50, bytes: size })
    history = recordHistory(history, a, b, { actions: 50, bytes: size })
    expect(history.entries).toHaveLength(1); expect(history.bytes).toBeLessThanOrEqual(size)
    history = historyCandidate(b, history, 'undo', now).history
    history = recordHistory(history, a, c, { actions: 50, bytes: size })
    expect(history.entries).toHaveLength(1); expect(history.entries[0].after).toBe(designSnapshot(c))
    history = recordHistory(history, c, p, { actions: 50, bytes: 1 })
    expect(history.entries).toHaveLength(0); expect(history.bytes).toBe(0); expect(history.truncated).toBe(true)
  })
  it('rejects a mismatched design instead of applying a stale snapshot', () => {
    const p = fixture(), a = finish(p, '#111111'), history = recordHistory(emptyHistory(), p, a)
    expect(() => historyCandidate(p, history, 'undo', now)).toThrow(expect.objectContaining({ code: 'stale' }))
  })
})
