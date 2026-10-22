import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { createRoomProject } from '../projects/create-room-project'
import { convertMeasurementText, initialRoomDraft, projectFromRoomDraft, readMeasurement, validateRoomDraft, type RoomDraft } from '../projects/room-draft'
import { createProjectRepository } from '../storage/project-repository'
import { createProjectStore } from '../state/project-store'
import { getWalls, polygonArea } from '../geometry/rooms'

const draft: RoomDraft = { ...initialRoomDraft, projectName: ' Casa ', roomName: ' Dormitorio ', width: '4,2', depth: '3.15', height: '2,65' }
const now = () => new Date('2026-10-22T12:00:00.000Z')
function ids(prefix = 'design') { let n = 0; return () => `${prefix}-${++n}` }
function project(prefix = 'design') { return projectFromRoomDraft(draft, 'es', { now, id: ids(prefix) }) }
const databases: string[] = []
function repository() {
  const name = `cuartos-test-${crypto.randomUUID()}`
  databases.push(name)
  return { name, repo: createProjectRepository(name) }
}
afterEach(async () => { for (const name of databases.splice(0)) await Dexie.delete(name) })

describe('room creation entries', () => {
  it.each([
    ['4,2', 'm', 4.2], ['420', 'cm', 4.2], ['.5', 'm', 0.5], [',5', 'm', 0.5],
    [' 315,25 ', 'cm', 3.1525], ['10', 'cm', 0.1], ['100', 'm', 100],
  ] as const)('reads %s %s as %s metres', (text, unit, expected) => {
    expect(readMeasurement(text, unit)).toBe(expected)
  })
  it.each(['', ' ', '-2', '0', '0.09', '100.1', '1e2', 'Infinity', '1,2.3', '3m', '1 000', '9'.repeat(400)])('rejects invalid measurement %s', text => {
    expect(readMeasurement(text, 'm')).toBeNull()
  })
  it('converts units without rounding or changing an invalid entry', () => {
    const exact = '4.123456789123456789'
    expect(convertMeasurementText(exact, 'm', 'cm')).toBe('412.3456789123456789')
    expect(convertMeasurementText(convertMeasurementText(exact, 'm', 'cm'), 'cm', 'm')).toBe(exact)
    expect(convertMeasurementText(',5', 'm', 'cm')).toBe('50')
    expect(convertMeasurementText('4', 'cm', 'm')).toBe('0.04')
    expect(convertMeasurementText('0', 'm', 'cm')).toBe('0')
    expect(convertMeasurementText('abc', 'm', 'cm')).toBe('abc')
  })
  it('validates names and each dimension without mutating entries', () => {
    const invalid = { ...draft, projectName: '  ', roomName: 'x'.repeat(121), width: '', depth: '-3', height: '0' }
    expect(validateRoomDraft(invalid)).toEqual({ projectName: 'nameRequired', roomName: 'nameTooLong', width: 'measurement', depth: 'measurement', height: 'measurement' })
    expect(invalid.width).toBe('')
    expect(() => projectFromRoomDraft(invalid, 'es', { now, id: ids() })).toThrow()
  })
  it('creates the same rectangle in either unit, with the supplied names, height and language', () => {
    const a = project()
    const b = projectFromRoomDraft({ ...draft, width: '420', depth: '315', height: '265', unit: 'cm' }, 'en', { now, id: ids() })
    expect(a.rooms).toEqual(b.rooms)
    expect(a.name).toBe('Casa')
    expect(a.rooms[0].name).toBe('Dormitorio')
    expect(a.rooms[0].height).toBe(2.65)
    expect(getWalls(a.rooms[0]).map(wall => wall.length)).toEqual([4.2, 3.15, 4.2, 3.15])
    expect(polygonArea(a.rooms[0].polygon)).toBeCloseTo(13.23)
    expect(b.languageMetadata.createdWith).toBe('en')
  })
})

describe('local project storage and publication', () => {
  it('reopens an exact saved project through a new database connection', async () => {
    const { name, repo } = repository(), original = project()
    await repo.create(original)
    repo.close()
    const reopened = createProjectRepository(name)
    expect(await reopened.get(original.id)).toEqual(original)
    expect(await reopened.list()).toEqual({ projects: [original], unreadable: 0 })
    reopened.close()
  })
  it('retains multiple projects in newest-first order and never overwrites duplicate IDs', async () => {
    const { repo } = repository(), first = project('first'), second = { ...project('second'), updatedAt: '2026-10-23T12:00:00.000Z' }
    await repo.create(first); await repo.create(second)
    await expect(repo.create({ ...first, name: 'Replacement' })).rejects.toBeDefined()
    expect(await repo.get(first.id)).toEqual(first)
    expect((await repo.list()).projects.map(p => p.id)).toEqual([second.id, first.id])
    repo.close()
  })
  it('rejects invalid writes before touching stored projects', async () => {
    const { repo } = repository(), original = project()
    await repo.create(original)
    await expect(repo.create({ ...original, schemaVersion: 2 } as unknown as typeof original)).rejects.toBeDefined()
    expect(await repo.get(original.id)).toEqual(original)
    await expect(repo.get('missing')).rejects.toBeDefined()
    repo.close()
  })
  it('keeps corrupt, future and mismatched records untouched while listing valid projects', async () => {
    const { name, repo } = repository(), original = project()
    await repo.create(original)
    const raw = new Dexie(name)
    raw.version(1).stores({ projects: 'id' })
    const records = [
      { id: 'corrupt', json: '{broken' },
      { id: 'future', json: JSON.stringify({ ...original, schemaVersion: 2 }) },
      { id: 'mismatch', json: JSON.stringify(original) },
    ]
    await raw.table('projects').bulkAdd(records)
    expect(await repo.list()).toEqual({ projects: [original], unreadable: 3 })
    for (const record of records) {
      await expect(repo.get(record.id)).rejects.toBeDefined()
      expect(await raw.table('projects').get(record.id)).toEqual(record)
    }
    raw.close(); repo.close()
  })
  it('surfaces an unavailable connection instead of returning an empty success', async () => {
    const { name, repo } = repository(), original = project()
    await repo.create(original)
    repo.close()
    await expect(repo.list()).rejects.toBeDefined()
    const reopened = createProjectRepository(name)
    expect(await reopened.get(original.id)).toEqual(original)
    reopened.close()
  })
  it('publishes the saved project through the shared store only after a successful write', async () => {
    const { repo } = repository(), store = createProjectStore()
    const created = await createRoomProject(draft, 'en', { repository: repo, store, now, id: ids() })
    expect(store.getState().project).toEqual(await repo.get(created.id))
    expect(Object.isFrozen(store.getState().project?.rooms[0])).toBe(true)
    repo.close()
  })
  it('keeps the active project and input values intact on a quota failure', async () => {
    const store = createProjectStore()
    store.getState().loadProject(project('existing'))
    const previous = store.getState().project, entered = { ...draft }
    await expect(createRoomProject(entered, 'es', {
      store, now, id: ids(), repository: { create: async () => { throw new DOMException('Full', 'QuotaExceededError') } },
    })).rejects.toBeDefined()
    expect(store.getState().project).toBe(previous)
    expect(entered).toEqual(draft)
  })
})
