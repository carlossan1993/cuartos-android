import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { createProject, createRectangularRoom, deserializeProject, serializeProject } from '../domain/project'
import type { Project } from '../domain/types'
import { FINISH_PRESETS, parseFinishColor, patternKind, presetFor } from '../finishes/catalog'
import { roomWithFinish } from '../finishes/changes'
import { finishPattern } from '../finishes/pattern'
import { getWalls } from '../geometry/rooms'
import { createProjectStore } from '../state/project-store'
import { createProjectRepository } from '../storage/project-repository'
import { saveFinishChange } from '../projects/save-finish'

function fixture(): Project {
  const room = createRectangularRoom({ id: 'room', name: 'Dormitorio', width: 4.2, depth: 3.15 })
  return { ...createProject({ id: 'project', name: 'Casa', language: 'es', now: '2026-10-22T12:00:00.000Z' }), rooms: [room, createRectangularRoom({ id: 'other', name: 'Estudio', width: 2, depth: 2, origin: { x: 5, y: 0 } })], openings: [{ id: 'door', roomId: room.id, wallId: getWalls(room)[0].id, type: 'door', offset: .5, width: .9, height: 2.1, sillHeight: 0 }], furniture: [{ id: 'chair', roomId: room.id, catalogId: 'chair', position: { x: 2, y: 2 }, rotation: 0, dimensions: { width: .5, depth: .5, height: 1 }, materialOverrides: {} }] }
}
const blue = { color: '#03038c' }, oak = FINISH_PRESETS.find(p => p.id === 'oak')!.material
const now = () => new Date('2026-10-22T22:00:00.000Z')
const databases: string[] = []
function repository() { const name = `finishes-${crypto.randomUUID()}`; databases.push(name); return { name, repo: createProjectRepository(name) } }
afterEach(async () => { for (const name of databases.splice(0)) await Dexie.delete(name) })

describe('finish library and semantic changes', () => {
  it('keeps the requested deep blue, unique presets and JSON-only materials', () => {
    expect(new Set(FINISH_PRESETS.map(p => p.id)).size).toBe(FINISH_PRESETS.length)
    expect(presetFor(blue)?.id).toBe('blue')
    for (const preset of FINISH_PRESETS) expect(() => roomWithFinish(fixture(), 'room', { kind: 'floor' }, preset.material)).not.toThrow()
    expect(presetFor({ color: '#03038C' })?.id).toBe('blue')
    expect(presetFor({ color: '#03038c', textureId: 'custom' })).toBeUndefined()
  })
  it.each(['red', '#fff', '#12345678', '123456', '#gggggg', ''])('rejects incomplete or invalid hex %s', value => expect(parseFinishColor(value)).toBeNull())
  it('normalizes valid color input and preserves unknown pattern identifiers', () => {
    expect(parseFinishColor(' #ABCDEF ')).toBe('#abcdef')
    const p = fixture(), material = { color: '#123456', textureId: 'future-finish' }
    const room = roomWithFinish(p, 'room', { kind: 'floor' }, material)
    expect(patternKind(material)).toBe('unknown')
    expect(deserializeProject(serializeProject({ ...p, rooms: [room, p.rooms[1]] })).rooms[0].floorMaterial).toEqual(material)
  })
  it('changes just one wall using stable IDs after array rotation', () => {
    const p = fixture(), original = p.rooms[0], wallId = getWalls(original)[2].id
    const rotated = { ...original, polygon: [...original.polygon.slice(1), original.polygon[0]] }
    const room = roomWithFinish({ ...p, rooms: [rotated, p.rooms[1]] }, 'room', { kind: 'wall', wallId }, blue)
    expect(room.wallMaterials[wallId]).toEqual(blue)
    for (const [id, value] of Object.entries(original.wallMaterials)) if (id !== wallId) expect(room.wallMaterials[id]).toEqual(value)
    expect(room.floorMaterial).toEqual(original.floorMaterial)
    expect(p.rooms[0]).toBe(original)
  })
  it('applies all walls atomically and keeps the floor and geometry', () => {
    const p = fixture(), next = roomWithFinish(p, 'room', { kind: 'allWalls' }, blue)
    expect(Object.values(next.wallMaterials)).toEqual(Array(4).fill(blue))
    expect(next.polygon).toBe(p.rooms[0].polygon)
    expect(next.floorMaterial).toBe(p.rooms[0].floorMaterial)
  })
  it('rejects stale targets and malformed materials before changing the room', () => {
    expect(() => roomWithFinish(fixture(), 'missing', { kind: 'floor' }, blue)).toThrow()
    expect(() => roomWithFinish(fixture(), 'room', { kind: 'wall', wallId: 'room:b:a' }, blue)).toThrow()
    for (const material of [{ color: 'red' }, { color: '#ffffff', textureId: 'a/b' }, { color: '#ffffff', extra: 1 }]) expect(() => roomWithFinish(fixture(), 'room', { kind: 'floor' }, material)).toThrow()
  })
})

describe('schematic floor drawing', () => {
  const bounds = { left: -.35, top: -.2, right: 4.2, bottom: 3.15 }
  it.each(['floor-planks', 'floor-tiles'])('uses bounded metre geometry for %s including negative origins', textureId => {
    const material = { color: '#ffffff', textureId }, segments = finishPattern(material, bounds, 100)
    expect(segments.length).toBeGreaterThan(10)
    expect(segments.length).toBeLessThanOrEqual(400)
    for (const [a, b] of segments) {
      expect(a.x === b.x || a.y === b.y).toBe(true)
      expect(a.x <= b.x && a.y <= b.y).toBe(true)
      for (const p of [a, b]) { expect(p.x).toBeGreaterThanOrEqual(bounds.left); expect(p.x).toBeLessThanOrEqual(bounds.right); expect(p.y).toBeGreaterThanOrEqual(bounds.top); expect(p.y).toBeLessThanOrEqual(bounds.bottom) }
    }
    expect(finishPattern(material, bounds, 200)).toEqual(segments)
    expect(finishPattern(material, bounds, .1)).toEqual([])
    expect(finishPattern(material, { left: 0, top: 0, right: 10000, bottom: 10000 }, 100)).toEqual([])
  })
  it('falls back to the stored solid color for unknown textures without mutating data', () => {
    const material = { color: '#123456', textureId: 'unknown' }
    expect(finishPattern(material, bounds, 100)).toEqual([])
    expect(material.textureId).toBe('unknown')
    expect(finishPattern(blue, bounds, 100)).toEqual([])
  })
})

describe('transactional finish saving', () => {
  it('reopens floor/single-wall/all-wall changes without losing other rooms, openings or furniture', async () => {
    const { name, repo } = repository(), p = fixture(), store = createProjectStore()
    await repo.create(p); store.getState().loadProject(p)
    const wallId = getWalls(p.rooms[0])[1].id
    for (const change of [{ target: { kind: 'floor' } as const, material: oak }, { target: { kind: 'wall', wallId } as const, material: blue }, { target: { kind: 'allWalls' } as const, material: blue }]) await saveFinishChange({ roomId: 'room', ...change }, { repository: repo, store, now })
    repo.close()
    const reopened = createProjectRepository(name), saved = await reopened.get(p.id)
    expect(saved.rooms[0].floorMaterial).toEqual(oak)
    expect(Object.values(saved.rooms[0].wallMaterials)).toEqual(Array(4).fill(blue))
    expect(saved.rooms[0].polygon).toEqual(p.rooms[0].polygon)
    expect(saved.rooms[1]).toEqual(p.rooms[1])
    expect(saved.openings).toEqual(p.openings); expect(saved.furniture).toEqual(p.furniture)
    expect(saved.schemaVersion).toBe(1)
    expect(saved.updatedAt).toBe(now().toISOString())
    expect(Object.isFrozen(store.getState().project?.rooms[0].floorMaterial)).toBe(true)
    reopened.close()
  })
  it('keeps stored and active snapshots on invalid input and write failure', async () => {
    const { repo } = repository(), p = fixture(), store = createProjectStore()
    await repo.create(p); store.getState().loadProject(p)
    const previous = store.getState().project
    await expect(saveFinishChange({ roomId: 'room', target: { kind: 'floor' }, material: { color: 'red' } }, { repository: repo, store, now })).rejects.toBeDefined()
    await expect(saveFinishChange({ roomId: 'room', target: { kind: 'floor' }, material: oak }, { store, now, repository: { replace: async () => { throw new DOMException('Full', 'QuotaExceededError') } } })).rejects.toBeDefined()
    expect(store.getState().project).toBe(previous); expect(await repo.get(p.id)).toEqual(p)
    repo.close()
  })
  it('refuses a stale finish save after another screen changes the project', async () => {
    const { repo } = repository(), p = fixture(), store = createProjectStore()
    await repo.create(p); store.getState().loadProject(p)
    const other = { ...p, name: 'Changed elsewhere' }
    await repo.replace(other, p)
    await expect(saveFinishChange({ roomId: 'room', target: { kind: 'floor' }, material: oak }, { repository: repo, store, now })).rejects.toMatchObject({ code: 'conflict' })
    expect(await repo.get(p.id)).toEqual(other)
    expect(store.getState().project?.rooms).toEqual(p.rooms)
    repo.close()
  })
})
