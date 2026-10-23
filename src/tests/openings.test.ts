import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { createProject, createRectangularRoom } from '../domain/project'
import type { Opening, Project } from '../domain/types'
import { assertProject } from '../domain/validation'
import { initialOpeningDraft, validateOpeningDraft } from '../editor2d/opening-draft'
import { openingAtPoint, worldToScreen } from '../editor2d/viewport'
import { openingGeometry } from '../geometry/openings'
import { getWalls, pointInPolygon } from '../geometry/rooms'
import { saveOpeningChange } from '../projects/save-opening'
import { createProjectStore } from '../state/project-store'
import { createProjectRepository } from '../storage/project-repository'

const now = () => new Date('2026-10-22T22:00:00.000Z')
function fixture(): Project {
  return { ...createProject({ id: 'project', name: 'Casa', language: 'es', now: '2026-10-22T12:00:00.000Z' }), rooms: [createRectangularRoom({ id: 'room', name: 'Dormitorio', width: 4, depth: 3 })], furniture: [{ id: 'chair', roomId: 'room', catalogId: 'chair', position: { x: 2, y: 2 }, rotation: 0, dimensions: { width: 0.5, depth: 0.5, height: 1 }, materialOverrides: {} }] }
}
function door(): Opening { return { id: 'door', roomId: 'room', wallId: getWalls(fixture().rooms[0])[0].id, type: 'door', offset: 0.5, width: 0.9, height: 2.1, sillHeight: 0 } }
const databases: string[] = []
function repository() { const name = `openings-${crypto.randomUUID()}`; databases.push(name); return { name, repo: createProjectRepository(name) } }
afterEach(async () => { for (const name of databases.splice(0)) await Dexie.delete(name) })

describe('opening input and shared domain validation', () => {
  it('converts cm/comma entries and requires doors to start at the floor', () => {
    const p = fixture(), draft = { ...initialOpeningDraft(p, 'room', 'door'), unit: 'cm' as const, offset: '50', width: '90,5', height: '210', sillHeight: '99' }
    const result = validateOpeningDraft(draft, p, 'door')
    expect(result.opening).toEqual({ ...door(), width: 0.905 })
  })
  it.each(['', '-2', '1e2', 'Infinity', '1,2.3', '0'])('preserves and rejects an invalid width: %s', width => {
    const draft = { ...initialOpeningDraft(fixture(), 'room', 'door'), width }
    expect(validateOpeningDraft(draft, fixture(), 'door').errors.width).toBe('positive')
    expect(draft.width).toBe(width)
  })
  it('maps wall/height errors from the authoritative domain without dropping values', () => {
    const draft = { ...initialOpeningDraft(fixture(), 'room', 'window'), offset: '3.5', width: '1' }
    expect(validateOpeningDraft(draft, fixture(), 'window').errors.width).toBe('wallFit')
    expect(validateOpeningDraft({ ...draft, offset: '0', height: '2', sillHeight: '1' }, fixture(), 'window').errors.height).toBe('heightFit')
    expect(validateOpeningDraft({ ...draft, wallId: 'missing' }, fixture(), 'window').errors.wallId).toBe('choose')
  })
  it('rejects overlaps but permits adjacent and vertically separate openings', () => {
    const p = { ...fixture(), openings: [door()] }, draft = initialOpeningDraft(p, 'room', 'window')
    expect(validateOpeningDraft({ ...draft, offset: '0.6', width: '0.5', sillHeight: '1', height: '0.5' }, p, 'window').issue).toBe('overlap')
    expect(validateOpeningDraft({ ...draft, offset: '1.4', width: '0.5' }, p, 'window').opening).toBeDefined()
    expect(validateOpeningDraft({ ...draft, offset: '0.6', width: '0.5', sillHeight: '2.2', height: '0.3' }, p, 'window').opening).toBeDefined()
    expect(validateOpeningDraft(initialOpeningDraft(p, 'room', 'door', door()), p, 'door', true).opening).toEqual(door())
  })
  it('reports missing edits and limit errors without constructing a replacement', () => {
    const p = fixture(), draft = initialOpeningDraft(p, 'room', 'door')
    expect(validateOpeningDraft(draft, p, 'missing', true).issue).toBe('notFound')
    expect(validateOpeningDraft(draft, { ...p, openings: Array(256).fill(door()) }, 'new').issue).toBe('limit')
  })
  it('keeps schema 1 while exposing specific internal error codes', () => {
    expect(fixture().schemaVersion).toBe(1)
    expect(() => assertProject({ ...fixture(), openings: [{ ...door(), sillHeight: 0.1 }] })).toThrow(expect.objectContaining({ code: 'door_above_floor' }))
  })
})

describe('geometry and selection on every wall', () => {
  it.each([0, 1, 2, 3])('derives an inward door on directed wall %s', index => {
    const room = fixture().rooms[0], opening = { ...door(), wallId: getWalls(room)[index].id }, shape = openingGeometry(opening, room)
    expect(Math.hypot(shape.start.x - shape.end.x, shape.start.y - shape.end.y)).toBeCloseTo(0.9)
    expect(pointInPolygon(shape.leaf, room.polygon)).toBe(true)
    expect(shape.arc[0].x).toBeCloseTo(shape.end.x)
    expect(shape.arc[0].y).toBeCloseTo(shape.end.y)
    expect(shape.arc.at(-1)!.x).toBeCloseTo(shape.leaf.x)
    expect(shape.arc.at(-1)!.y).toBeCloseTo(shape.leaf.y)
  })
  it('preserves references if the starting vertex in the array rotates', () => {
    const room = fixture().rooms[0], rotated = { ...room, polygon: [...room.polygon.slice(1), room.polygon[0]] }
    expect(openingGeometry(door(), rotated)).toEqual(openingGeometry(door(), room))
  })
  it.each([20, 200])('selects a leaf/segment with constant pixel tolerance at scale %s', scale => {
    const p = { ...fixture(), openings: [door()] }, camera = { x: 30, y: 50, scale }, shape = openingGeometry(door(), p.rooms[0])
    expect(openingAtPoint(worldToScreen(shape.leaf, camera), camera, p)).toBe('door')
    const middle = worldToScreen({ x: 0.95, y: 0 }, camera)
    expect(openingAtPoint({ x: middle.x, y: middle.y - 8 }, camera, p)).toBe('door')
    expect(openingAtPoint({ x: middle.x, y: middle.y - 12 }, camera, p)).toBeNull()
  })
})

describe('atomic saved opening edits', () => {
  it('adds, edits and removes through the shared actions, retaining all other data on reopen', async () => {
    const { name, repo } = repository(), p = fixture(), store = createProjectStore()
    await repo.create(p); store.getState().loadProject(p)
    await saveOpeningChange({ type: 'add', opening: door() }, { repository: repo, store, now })
    expect((await repo.get(p.id)).openings).toEqual([door()])
    await saveOpeningChange({ type: 'update', opening: { ...door(), width: 1.1 } }, { repository: repo, store, now })
    expect(store.getState().project?.openings[0].width).toBe(1.1)
    expect(Object.isFrozen(store.getState().project?.openings[0])).toBe(true)
    await saveOpeningChange({ type: 'remove', id: 'door' }, { repository: repo, store, now })
    repo.close()
    const reopened = createProjectRepository(name), recovered = await reopened.get(p.id)
    expect(recovered).toEqual({ ...p, updatedAt: now().toISOString() })
    reopened.close()
  })
  it('leaves the active snapshot untouched on invalid input or write failure', async () => {
    const { repo } = repository(), p = fixture(), store = createProjectStore()
    await repo.create(p); store.getState().loadProject(p)
    const previous = store.getState().project
    await expect(saveOpeningChange({ type: 'add', opening: { ...door(), width: 10 } }, { repository: repo, store, now })).rejects.toBeDefined()
    await expect(saveOpeningChange({ type: 'add', opening: door() }, { store, now, repository: { replace: async () => { throw new DOMException('Full', 'QuotaExceededError') } } })).rejects.toBeDefined()
    expect(store.getState().project).toBe(previous)
    expect(await repo.get(p.id)).toEqual(p)
    repo.close()
  })
  it('serializes concurrent edits and rejects stale writes instead of losing another change', async () => {
    const { name, repo } = repository(), other = createProjectRepository(name), p = fixture()
    await repo.create(p)
    const a = { ...p, name: 'A' }, b = { ...p, name: 'B' }
    const results = await Promise.allSettled([repo.replace(a, p), other.replace(b, p)])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1)
    expect((results.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.code).toBe('conflict')
    expect(['A', 'B']).toContain((await repo.get(p.id)).name)
    repo.close(); other.close()
  })
  it.each(['{broken', JSON.stringify({ ...fixture(), schemaVersion: 2 }), JSON.stringify({ ...fixture(), id: 'other' })])('never replaces an unreadable/future/mismatched record', async json => {
    const { name, repo } = repository(), p = fixture()
    await repo.create(p)
    const raw = new Dexie(name); raw.version(1).stores({ projects: 'id' })
    await raw.table('projects').update(p.id, { json })
    await expect(repo.replace({ ...p, openings: [door()] }, p)).rejects.toMatchObject({ code: 'unreadable' })
    expect((await raw.table('projects').get(p.id)).json).toBe(json)
    raw.close(); repo.close()
  })
  it('does not resurrect a deleted record', async () => {
    const { repo } = repository()
    await expect(repo.replace(fixture(), fixture())).rejects.toMatchObject({ code: 'missing' })
    expect((await repo.list()).projects).toEqual([])
    repo.close()
  })
  it('does not publish a late completion into a different active project', async () => {
    const store = createProjectStore(); store.getState().loadProject(fixture())
    let finish!: () => void
    const operation = saveOpeningChange({ type: 'add', opening: door() }, { store, now, repository: { replace: () => new Promise<void>(resolve => { finish = resolve }) } })
    store.getState().loadProject({ ...fixture(), id: 'other' })
    const current = store.getState().project
    finish(); await operation
    expect(store.getState().project).toBe(current)
  })
})
