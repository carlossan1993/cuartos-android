import { describe, expect, it } from 'vitest'
import { DomainError } from '../domain/errors'
import { createProject, createRectangularRoom, deserializeProject, MAX_PROJECT_JSON_BYTES, serializeProject } from '../domain/project'
import type { FurnitureItem, Opening, Project, Vertex } from '../domain/types'
import { assertProject } from '../domain/validation'
import { assertOrthogonalPolygon, getWalls, pointInPolygon, polygonArea } from '../geometry/rooms'
import { fromMeters, normalizeRotation, planToWorld, toMeters, worldToPlan } from '../geometry/units'
import { createProjectStore } from '../state/project-store'

const now = '2026-10-22T18:00:00.000Z'
const room = () => createRectangularRoom({ id: 'room-1', name: 'Dormitorio', width: 4, depth: 3 })
const opening = (): Opening => ({ id: 'door-1', roomId: 'room-1', wallId: 'room-1:a:b', type: 'door', offset: 0.5, width: 0.9, height: 2.1, sillHeight: 0 })
const furniture = (): FurnitureItem => ({ id: 'bed-1', roomId: 'room-1', catalogId: 'bed-double', position: { x: 1.5, y: 1.8 }, rotation: 0, dimensions: { width: 1.4, depth: 2, height: 0.5 }, materialOverrides: { fabric: { color: '#03038c' } } })
function fixture(): Project {
  return {
    ...createProject({ id: 'project-1', name: 'Mi cuarto', language: 'es', now }),
    rooms: [room()], openings: [opening()], furniture: [furniture()],
  }
}
const polygon = (points: readonly (readonly [number, number])[]): Vertex[] => points.map(([x, y], i) => ({ id: `v${i}`, x, y }))
const setup = () => createProjectStore({ id: () => 'project-1', now: () => new Date(now) })

describe('units and a deterministic 2D/3D coordinate system', () => {
  it('converts real dimensions without rounding the stored measurements', () => {
    expect(toMeters(325, 'cm')).toBe(3.25)
    expect(fromMeters(3.25, 'cm')).toBe(325)
    expect(toMeters(3.2571, 'm')).toBe(3.2571)
    expect(fromMeters(toMeters(-82.5, 'cm'), 'cm')).toBe(-82.5)
  })
  it.each([NaN, Infinity, -Infinity])('rejects non-finite measurements: %s', value => {
    expect(() => toMeters(value, 'm')).toThrow(DomainError)
    expect(() => normalizeRotation(value)).toThrow(DomainError)
  })
  it('rejects conversion overflow and unknown units', () => {
    expect(() => fromMeters(Number.MAX_VALUE, 'cm')).toThrow(DomainError)
    expect(() => toMeters(1, 'ft' as 'm')).toThrow(DomainError)
  })
  it.each([[-90, 270], [450, 90], [720, 0], [-360, 0], [45.5, 45.5]])('normalizes %s degrees to %s', (value, expected) => {
    expect(normalizeRotation(value)).toBe(expected)
  })
  it('maps plan Y to world Z and keeps elevation separate', () => {
    const point = { x: -1.2, y: 3.4 }
    expect(planToWorld(point, 0.8)).toEqual({ x: -1.2, y: 0.8, z: 3.4 })
    expect(worldToPlan(planToWorld(point, 0.8))).toEqual(point)
  })
})

describe('room geometry and stable wall references', () => {
  it('creates the requested rectangle in metres, including a shifted origin', () => {
    const r = createRectangularRoom({ id: 'r', name: 'Estudio', width: 3.25, depth: 2.75, height: 2.8, origin: { x: -1, y: 2 } })
    expect(r.polygon.map(({ x, y }) => [x, y])).toEqual([[-1, 2], [2.25, 2], [2.25, 4.75], [-1, 4.75]])
    expect(polygonArea(r.polygon)).toBeCloseTo(3.25 * 2.75)
    expect(getWalls(r).map(w => w.length)).toEqual([3.25, 2.75, 3.25, 2.75])
    expect(getWalls(r).map(w => w.orientation)).toEqual(['horizontal', 'vertical', 'horizontal', 'vertical'])
  })
  it.each([0, -3, NaN, Infinity])('rejects invalid rectangle dimensions: %s', width => {
    expect(() => createRectangularRoom({ id: 'r', name: 'x', width, depth: 3 })).toThrow(DomainError)
  })
  it('does not turn two negative dimensions into a valid rectangle', () => {
    expect(() => createRectangularRoom({ id: 'r', name: 'x', width: -4, depth: -3 })).toThrow(DomainError)
  })
  it('keeps wall identifiers when vertices move or the array starting point changes', () => {
    const r = room()
    const resized = { ...r, polygon: r.polygon.map(v => ({ ...v, x: v.x * 2 })) }
    expect(getWalls(resized).map(w => w.id)).toEqual(getWalls(r).map(w => w.id))
    const shifted = { ...r, polygon: [...r.polygon.slice(2), ...r.polygon.slice(0, 2)] }
    expect(getWalls(shifted).map(w => w.id).sort()).toEqual(getWalls(r).map(w => w.id).sort())
  })
  it('handles a concave orthogonal contour, including boundary points', () => {
    const l = polygon([[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]])
    expect(() => assertOrthogonalPolygon(l)).not.toThrow()
    expect(polygonArea(l)).toBe(12)
    expect(pointInPolygon({ x: 1, y: 3 }, l)).toBe(true)
    expect(pointInPolygon({ x: 3, y: 3 }, l)).toBe(false)
    expect(pointInPolygon({ x: 2, y: 3 }, l)).toBe(true)
    expect(pointInPolygon({ x: 0, y: 0 }, l)).toBe(true)
  })
  it.each([
    [[0, 0], [4, 0], [3, 3], [0, 3]],
    [[0, 0], [4, 0], [4, 4], [1, 4], [1, -1], [3, -1], [3, 2], [0, 2]],
    [[0, 0], [4, 0], [4, 0], [0, 3]],
    [[0, 0], [4, 0], [4, 0], [0, 0]],
  ])('rejects diagonal, crossed or degenerate contours: %j', (...points) => {
    expect(() => assertOrthogonalPolygon(polygon(points.map(([x, y]) => [x, y] as const)))).toThrow(DomainError)
  })
})

describe('versioned project serialization and data validation', () => {
  it('recovers a complete scene exactly, including view, materials and language metadata', () => {
    const original = fixture()
    const recovered = deserializeProject(serializeProject(original))
    expect(recovered).toEqual(original)
    expect(recovered).not.toBe(original)
    expect(recovered.rooms[0]).not.toBe(original.rooms[0])
  })
  it.each(['{broken', 'null', '[]', '{}'])('rejects malformed/incomplete JSON: %s', text => {
    expect(() => deserializeProject(text)).toThrow(DomainError)
  })
  it('rejects old and future schemas without silently dropping data', () => {
    for (const schemaVersion of [0, 2, '1']) {
      expect(() => deserializeProject(JSON.stringify({ ...fixture(), schemaVersion }))).toThrow(expect.objectContaining({ code: 'unsupported_schema' }))
    }
  })
  it('bounds imported bytes before parsing, including UTF-8', () => {
    expect(() => deserializeProject('é'.repeat(MAX_PROJECT_JSON_BYTES / 2 + 1))).toThrow(expect.objectContaining({ code: 'file_too_large' }))
  })
  it.each([
    { name: '  ' }, { createdAt: 'yesterday' }, { updatedAt: '2020-01-01T00:00:00.000Z' },
    { languageMetadata: { createdWith: 'fr' } }, { renderer: { type: 'ThreeObject' } },
    { viewSettings: { ...fixture().viewSettings, zoom2d: Infinity } },
    { viewSettings: { ...fixture().viewSettings, snap: 'true' } },
    { viewSettings: { ...fixture().viewSettings, camera3d: { position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } } } },
  ])('rejects invalid metadata, view or renderer state: %j', patch => {
    expect(() => assertProject({ ...fixture(), ...patch })).toThrow(DomainError)
  })
  it('rejects non-finite coordinates before JSON could turn them into null', () => {
    const original = fixture()
    const invalid = { ...original, furniture: [{ ...furniture(), position: { x: NaN, y: 1 } }] }
    expect(() => serializeProject(invalid)).toThrow(DomainError)
  })
  it('rejects holes in arrays, duplicate entities and duplicate vertex identifiers', () => {
    expect(() => assertProject({ ...fixture(), furniture: Array(1) })).toThrow(DomainError)
    expect(() => assertProject({ ...fixture(), furniture: [furniture(), furniture()] })).toThrow(DomainError)
    expect(() => assertProject({ ...fixture(), rooms: [{ ...room(), polygon: room().polygon.map(v => ({ ...v, id: 'a' })) }] })).toThrow(DomainError)
  })
  it('rejects dangling rooms, walls and material references', () => {
    expect(() => assertProject({ ...fixture(), furniture: [{ ...furniture(), roomId: 'missing' }] })).toThrow(expect.objectContaining({ code: 'invalid_reference' }))
    expect(() => assertProject({ ...fixture(), openings: [{ ...opening(), wallId: 'room-1:unknown' }] })).toThrow(expect.objectContaining({ code: 'invalid_reference' }))
    expect(() => assertProject({ ...fixture(), rooms: [{ ...room(), wallMaterials: { ...room().wallMaterials, missing: { color: '#ffffff' } } }] })).toThrow(DomainError)
  })
  it('does not require a catalog renderer to recover a furniture item', () => {
    const project = { ...fixture(), furniture: [{ ...furniture(), catalogId: 'future-item' }] }
    expect(deserializeProject(serializeProject(project)).furniture[0].dimensions).toEqual(furniture().dimensions)
  })
  it.each([
    { offset: -0.1 }, { width: 4 }, { height: 3 }, { sillHeight: 1 }, { width: 0 },
  ])('rejects an invalid opening: %j', patch => {
    expect(() => assertProject({ ...fixture(), openings: [{ ...opening(), ...patch }] })).toThrow(DomainError)
  })
  it('rejects overlapping openings but allows adjacent ones and windows above a door', () => {
    const a = opening()
    expect(() => assertProject({ ...fixture(), openings: [a, { ...a, id: 'door-2', offset: 1 }] })).toThrow(DomainError)
    expect(() => assertProject({ ...fixture(), openings: [a, { ...a, id: 'door-2', offset: 1.4 }] })).not.toThrow()
    expect(() => assertProject({ ...fixture(), openings: [a, { ...a, id: 'window-1', type: 'window', sillHeight: 2.2, height: 0.3 }] })).not.toThrow()
  })
})

describe('semantic editing through a single shared store', () => {
  it('creates, modifies, exports and reopens a project without React or a renderer', () => {
    const store = setup()
    store.getState().newProject(' Dormitorio ', 'es')
    store.getState().addRoom(room())
    store.getState().addOpening(opening())
    store.getState().addFurniture({ ...furniture(), rotation: -90 })
    store.getState().renameProject('Alternativa A')
    const exported = store.getState().exportProject()
    expect(store.getState().project?.furniture[0].rotation).toBe(270)
    store.getState().closeProject()
    store.getState().importProject(exported)
    expect(store.getState().project?.name).toBe('Alternativa A')
    expect(store.getState().project?.rooms[0].polygon).toEqual(room().polygon)
  })
  it('publishes one identical immutable snapshot to 2D/3D subscribers', () => {
    const store = setup()
    const twoD: (Project | null)[] = [], threeD: (Project | null)[] = []
    store.subscribe(state => twoD.push(state.project))
    store.subscribe(state => threeD.push(state.project))
    store.getState().loadProject(fixture())
    store.getState().updateFurniture({ ...furniture(), position: { x: 2, y: 2 }, rotation: 450 })
    expect(twoD[1]).toBe(threeD[1])
    expect(twoD[1]?.furniture[0].rotation).toBe(90)
    expect(twoD[0]?.furniture[0].rotation).toBe(0)
    expect(Object.isFrozen(twoD[1]?.rooms[0].polygon[0])).toBe(true)
  })
  it('does not expose caller-owned mutable objects in state', () => {
    const store = setup(), source = fixture()
    store.getState().loadProject(source)
    expect(store.getState().project?.rooms).not.toBe(source.rooms)
    const input = { ...furniture(), position: { x: 2, y: 2 } }
    store.getState().updateFurniture(input)
    input.position.x = 99
    expect(store.getState().project?.furniture[0].position.x).toBe(2)
  })
  it('leaves the entire previous snapshot intact after failed edit/import', () => {
    const store = setup()
    store.getState().loadProject(fixture())
    const previous = store.getState().project
    expect(() => store.getState().addFurniture(furniture())).toThrow(DomainError)
    expect(() => store.getState().importProject('{')).toThrow(DomainError)
    expect(() => store.getState().renameProject('  ')).toThrow(DomainError)
    expect(() => store.getState().removeRoom('missing')).toThrow(DomainError)
    expect(store.getState().project).toBe(previous)
  })
  it('blocks room resizing that would invalidate an existing opening', () => {
    const store = setup()
    store.getState().loadProject(fixture())
    const previous = store.getState().project
    expect(() => store.getState().updateRoom(createRectangularRoom({ id: 'room-1', name: 'Dormitorio', width: 1, depth: 3 }))).toThrow(DomainError)
    expect(store.getState().project).toBe(previous)
  })
  it('resizes a room without retargeting its openings or scaling furniture', () => {
    const store = setup()
    store.getState().loadProject(fixture())
    store.getState().updateRoom(createRectangularRoom({ id: 'room-1', name: 'Dormitorio', width: 5, depth: 3 }))
    expect(store.getState().project?.openings[0]).toEqual(opening())
    expect(store.getState().project?.furniture[0].position).toEqual(furniture().position)
    expect(getWalls(store.getState().project!.rooms[0])[0].length).toBe(5)
  })
  it('edits/removes objects and view settings without deleting the room', () => {
    const store = setup()
    store.getState().loadProject(fixture())
    store.getState().updateOpening({ ...opening(), offset: 2 })
    store.getState().setViewSettings({ ...fixture().viewSettings, grid: false, zoom2d: 2 })
    expect(store.getState().project?.openings[0].offset).toBe(2)
    expect(store.getState().project?.viewSettings.zoom2d).toBe(2)
    store.getState().removeOpening('door-1')
    store.getState().removeFurniture('bed-1')
    const recovered = deserializeProject(store.getState().exportProject())
    expect(recovered.rooms).toHaveLength(1)
    expect(recovered.openings).toEqual([])
    expect(recovered.furniture).toEqual([])
    expect(recovered.viewSettings.grid).toBe(false)
  })
  it('removes dependent furniture/openings with their room, retaining another room', () => {
    const store = setup()
    store.getState().loadProject(fixture())
    store.getState().addRoom(createRectangularRoom({ id: 'room-2', name: 'Estudio', width: 2, depth: 3, origin: { x: 4, y: 0 } }))
    store.getState().removeRoom('room-1')
    expect(store.getState().project?.rooms.map(r => r.id)).toEqual(['room-2'])
    expect(store.getState().project?.openings).toEqual([])
    expect(store.getState().project?.furniture).toEqual([])
  })
  it('keeps dates monotonic if the device clock moves backwards', () => {
    const store = createProjectStore({ now: () => new Date('2020-01-01T00:00:00.000Z') })
    store.getState().loadProject(fixture())
    store.getState().renameProject('Renombrado')
    expect(store.getState().project?.updatedAt).toBe(now)
  })
  it('rejects actions requiring an active project', () => {
    const store = setup()
    expect(() => store.getState().exportProject()).toThrow(expect.objectContaining({ code: 'missing_project' }))
    expect(() => store.getState().addRoom(room())).toThrow(DomainError)
  })
})
