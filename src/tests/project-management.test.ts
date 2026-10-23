import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { serializeProject } from '../domain/project'
import { getWalls } from '../geometry/rooms'
import { layoutConnections } from '../geometry/layout'
import { copyProject } from '../projects/project-copy'
import { projectFromRoomDraft, initialRoomDraft } from '../projects/room-draft'
import { saveProjectChange } from '../projects/save-project-change'
import { automaticCamera, restoredZoom } from '../projects/view-preferences'
import { createProjectRepository } from '../storage/project-repository'
import { createProjectStore } from '../state/project-store'
import { createSaveStatus } from '../state/save-status'

const now = () => new Date('2026-10-23T12:00:00.000Z')
function ids(prefix = 'copy') { let n = 0; return () => `${prefix}-${++n}` }
function fixture(shape: 'rectangle' | 'l' | 'connected' = 'connected') {
  const p = projectFromRoomDraft({ ...initialRoomDraft, shape, projectName: 'Casa', roomName: 'Sala', room2Name: 'Estudio' }, 'es', { now, id: ids('original') })
  const room = p.rooms[0], wallId = getWalls(room)[0].id
  return { ...p, rooms: [{ ...room, floorMaterial: { color: '#c39a68', textureId: 'floor-planks' }, wallMaterials: { ...room.wallMaterials, [wallId]: { color: '#03038c' } } }, ...p.rooms.slice(1)],
    openings: [{ id: 'door', roomId: room.id, wallId, type: 'door' as const, offset: .5, width: .9, height: 2.1, sillHeight: 0 }],
    furniture: [{ id: 'unknown', roomId: p.rooms.at(-1)!.id, catalogId: 'future-piece', position: { x: 1, y: 1 }, rotation: 37, dimensions: { width: .61, depth: .72, height: .9 }, materialOverrides: { body: { color: '#03038c', textureId: 'future-texture' } } }],
  }
}
const databases: string[] = []
function repository() { const name = `project-manager-${crypto.randomUUID()}`; databases.push(name); return { name, repo: createProjectRepository(name) } }
afterEach(async () => { for (const name of databases.splice(0)) await Dexie.delete(name) })

describe('independent project copies', () => {
  it.each(['rectangle', 'l', 'connected'] as const)('remaps every owned reference and preserves %s geometry/materials/unknown data', shape => {
    const source = fixture(shape), before = serializeProject(source), copy = copyProject(source, ' Nueva casa ', { id: ids(), now })
    expect(copy.id).not.toBe(source.id); expect(copy.name).toBe('Nueva casa')
    expect(copy.createdAt).toBe(now().toISOString()); expect(copy.updatedAt).toBe(copy.createdAt)
    expect(copy.languageMetadata).toEqual(source.languageMetadata); expect(copy.viewSettings).toEqual(source.viewSettings)
    source.rooms.forEach((room, i) => {
      const next = copy.rooms[i]
      expect(next.id).not.toBe(room.id)
      expect(next.polygon.map(({ x, y }) => ({ x, y }))).toEqual(room.polygon.map(({ x, y }) => ({ x, y })))
      expect(next.polygon.every((v, j) => v.id !== room.polygon[j].id)).toBe(true)
      expect(Object.values(next.wallMaterials)).toEqual(Object.values(room.wallMaterials))
      expect(next.floorMaterial).toEqual(room.floorMaterial)
    })
    expect(copy.openings[0]).toMatchObject({ roomId: copy.rooms[0].id, wallId: getWalls(copy.rooms[0])[0].id, offset: .5, width: .9 })
    expect(copy.openings[0].id).not.toBe(source.openings[0].id)
    expect(copy.furniture[0]).toMatchObject({ roomId: copy.rooms.at(-1)!.id, catalogId: 'future-piece', rotation: 37, dimensions: source.furniture[0].dimensions, materialOverrides: source.furniture[0].materialOverrides })
    expect(copy.furniture[0].id).not.toBe(source.furniture[0].id)
    expect(layoutConnections(copy.rooms).length).toBe(layoutConnections(source.rooms).length)
    expect(serializeProject(source)).toBe(before)
    expect(copy.rooms[0]).not.toBe(source.rooms[0])
  })
  it('rejects invalid names and reused source identifiers without changing the source', () => {
    const source = fixture(), before = serializeProject(source)
    expect(() => copyProject(source, ' ', { id: ids(), now })).toThrow()
    expect(() => copyProject(source, 'Copy', { id: () => source.rooms[0].id, now })).toThrow()
    expect(serializeProject(source)).toBe(before)
  })
})

describe('transactional management', () => {
  it('renames, copies and deletes independently, reopening all data from a new connection', async () => {
    const { name, repo } = repository(), p = fixture(), copy = copyProject(p, 'Copy', { id: ids(), now })
    await repo.create(p)
    const renamed = { ...p, name: 'Renamed' }
    await repo.replace(renamed, p)
    await repo.copy(copy, renamed)
    await repo.remove(renamed)
    repo.close()
    const reopened = createProjectRepository(name)
    try { expect((await reopened.list()).projects).toEqual([copy]); expect(await reopened.get(copy.id)).toEqual(copy) } finally { reopened.close() }
  })
  it('rejects stale rename, copy and delete after another connection changes the source', async () => {
    const { name, repo } = repository(), p = fixture(), second = createProjectRepository(name)
    try {
      await repo.create(p)
      const changed = { ...p, name: 'Another session' }
      await second.replace(changed, p)
      await expect(repo.replace({ ...p, name: 'Stale name' }, p)).rejects.toMatchObject({ code: 'conflict' })
      await expect(repo.copy(copyProject(p, 'Copy', { id: ids(), now }), p)).rejects.toMatchObject({ code: 'conflict' })
      await expect(repo.remove(p)).rejects.toMatchObject({ code: 'conflict' })
      expect((await repo.list()).projects).toEqual([changed])
    } finally { repo.close(); second.close() }
  })
  it('never recreates a missing source and rolls back an ID collision while copying', async () => {
    const { repo } = repository(), p = fixture(), copy = copyProject(p, 'Copy', { id: ids(), now })
    try {
      await repo.create(p); await repo.copy(copy, p)
      await expect(repo.copy(copy, p)).rejects.toBeDefined()
      expect((await repo.list()).projects).toHaveLength(2)
      await repo.remove(p)
      await expect(repo.copy(copyProject(p, 'Other', { id: ids('new'), now }), p)).rejects.toMatchObject({ code: 'missing' })
      await expect(repo.remove(p)).rejects.toMatchObject({ code: 'missing' })
      expect((await repo.list()).projects).toEqual([copy])
    } finally { repo.close() }
  })
  it('keeps unreadable or unknown-version source records untouched during destructive operations', async () => {
    const { name, repo } = repository(), p = fixture(), raw = new Dexie(name)
    raw.version(1).stores({ projects: 'id' })
    try {
      await repo.create(p)
      for (const json of ['{broken', JSON.stringify({ ...p, schemaVersion: 999 })]) {
        await raw.table('projects').put({ id: p.id, json })
        await expect(repo.remove(p)).rejects.toMatchObject({ code: 'unreadable' })
        await expect(repo.copy(copyProject(p, 'Copy', { id: ids(), now }), p)).rejects.toMatchObject({ code: 'unreadable' })
        expect(await raw.table('projects').get(p.id)).toEqual({ id: p.id, json })
      }
    } finally { repo.close(); raw.close() }
  })
})

describe('commit status and view preferences', () => {
  it('announces saved only after commit and keeps the previous snapshot on failure/retry', async () => {
    const p = fixture(), store = createProjectStore(), status = createSaveStatus()
    store.getState().loadProject(p)
    const previous = store.getState().project
    let finish!: () => void
    const writing = saveProjectChange(state => state.renameProject('Saved'), { store, status, now, repository: { replace: () => new Promise<void>(resolve => { finish = resolve }) } })
    expect(status.getState().phase).toBe('saving'); expect(store.getState().project).toBe(previous)
    finish(); await writing
    expect(status.getState().phase).toBe('saved'); expect(store.getState().project!.name).toBe('Saved')
    const saved = store.getState().project
    await expect(saveProjectChange(state => state.renameProject('Failed'), { store, status, now, repository: { replace: async () => { throw new DOMException('Full', 'QuotaExceededError') } } })).rejects.toBeDefined()
    expect(status.getState().phase).toBe('error'); expect(store.getState().project).toBe(saved)
    await saveProjectChange(state => state.renameProject('Retried'), { store, status, now, repository: { replace: async () => {} } })
    expect(status.getState().phase).toBe('saved'); expect(store.getState().project!.name).toBe('Retried')
  })
  it('does not let an old completion replace a new project or clear a later operation status', async () => {
    const p = fixture(), store = createProjectStore(), status = createSaveStatus()
    store.getState().loadProject(p)
    let finish!: () => void
    const writing = saveProjectChange(state => state.renameProject('Old completion'), { store, status, now, repository: { replace: () => new Promise<void>(resolve => { finish = resolve }) } })
    const other = copyProject(p, 'Other', { id: ids(), now })
    store.getState().loadProject(other)
    const token = status.begin(other.id); status.finish(token, 'error')
    finish(); await writing
    expect(store.getState().project!.id).toBe(other.id)
    expect(status.getState()).toMatchObject({ projectId: other.id, phase: 'error' })
    status.loaded(other.id); status.finish(token, 'error')
    expect(status.getState()).toMatchObject({ projectId: other.id, phase: 'saved' })
  })
  it('stores remembered preferences without changing geometry or overriding other view fields', async () => {
    const { repo } = repository(), p = fixture(), store = createProjectStore()
    try {
      await repo.create(p); store.getState().loadProject(p)
      await saveProjectChange(state => state.setViewSettings({ ...state.project!.viewSettings, grid: false, snap: false, zoom2d: 1.5625 }), { store, repository: repo, now })
      const saved = await repo.get(p.id)
      expect(saved.viewSettings).toMatchObject({ grid: false, snap: false, zoom2d: 1.5625, camera3d: p.viewSettings.camera3d })
      expect(saved.rooms).toEqual(p.rooms); expect(saved.openings).toEqual(p.openings); expect(saved.furniture).toEqual(p.furniture)
      expect(saved.schemaVersion).toBe(1)
    } finally { repo.close() }
  })
  it('recognizes the legacy automatic camera and bounds a remembered 2D zoom to the editor range', () => {
    const camera = fixture().viewSettings.camera3d
    expect(automaticCamera(camera)).toBe(true)
    expect(automaticCamera({ ...camera, target: { x: 1, y: 0, z: 0 } })).toBe(false)
    expect(restoredZoom(.05)).toBe(.25); expect(restoredZoom(50)).toBe(8); expect(restoredZoom(1.5625)).toBe(1.5625)
  })
})
