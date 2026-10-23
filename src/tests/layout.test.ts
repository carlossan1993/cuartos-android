import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { describe, expect, it } from 'vitest'
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { createRectangularRoom, deserializeProject, serializeProject } from '../domain/project'
import type { Opening, Room } from '../domain/types'
import { getWalls, pointInPolygon, polygonArea } from '../geometry/rooms'
import { layoutConnections, roomLabelCell, sharedWallSpans, visibleWallSpans, wallInward } from '../geometry/layout'
import { furnitureFits } from '../furniture/geometry'
import { initialOpeningDraft, validateOpeningDraft } from '../editor2d/opening-draft'
import { createRoomProject } from '../projects/create-room-project'
import { initialRoomDraft, projectFromRoomDraft, validateRoomDraft, type RoomDraft } from '../projects/room-draft'
import { createLRoom } from '../projects/layout-rooms'
import { createProjectStore } from '../state/project-store'
import { createProjectRepository } from '../storage/project-repository'
import { buildRoom3D } from '../viewer3d/model'
import { floorGeometry, solidGeometry } from '../viewer3d/geometry'

const now = () => new Date('2026-10-23T12:00:00.000Z')
function draft(shape: RoomDraft['shape'] = 'connected', orientation: RoomDraft['orientation'] = 'right'): RoomDraft { return { ...initialRoomDraft, projectName: 'Casa', roomName: 'Sala', room2Name: 'Estudio', shape, orientation, width: '4', depth: '3', width2: '3', depth2: '2', cutWidth: '1.5', cutDepth: '1' } }
function project(input = draft()) { let n = 0; return projectFromRoomDraft(input, 'es', { id: () => `id-${++n}`, now }) }
function lRoom() { return createLRoom({ id: 'l', name: 'L', width: 4, depth: 3, cutWidth: 1.5, cutDepth: 1, height: 2.6 }) }
function meshes(rooms: readonly Room[]) { return rooms.flatMap(room => { const model = buildRoom3D(room, [], rooms); return [...model.walls.map(wall => wall.solids), ...model.corners.map(corner => [corner.solid])].map(solids => { const mesh = new Mesh(solidGeometry(solids), new MeshBasicMaterial()); mesh.updateMatrixWorld(); return mesh }) }) }
function dispose(items: ReturnType<typeof meshes>) { items.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose() }) }

describe('L shape and draft geometry', () => {
  it('creates a six-edge orthogonal L with the exact cutout and stable wall materials', () => {
    const room = lRoom()
    expect(polygonArea(room.polygon)).toBe(10.5)
    expect(getWalls(room).map(wall => wall.length)).toEqual([4, 2, 1.5, 1, 2.5, 3])
    expect(Object.keys(room.wallMaterials)).toEqual(getWalls(room).map(wall => wall.id))
    expect(pointInPolygon({ x: 3.5, y: 2.5 }, room.polygon)).toBe(false)
    expect(pointInPolygon({ x: 1, y: 2.5 }, room.polygon)).toBe(true)
    const geometry = floorGeometry(room), floor = new Mesh(geometry, new MeshBasicMaterial())
    floor.updateMatrixWorld()
    expect(new Raycaster(new Vector3(3.5, 4, 2.5), new Vector3(0, -1, 0)).intersectObject(floor)).toHaveLength(0)
    expect(new Raycaster(new Vector3(1, 4, 2.5), new Vector3(0, -1, 0)).intersectObject(floor).length).toBeGreaterThan(0)
    geometry.dispose(); floor.material.dispose()
  })
  it.each([[0, 1], [4, 1], [1, 3], [-1, 1], [NaN, 1]])('rejects a collapsed/invalid cutout %s × %s', (cutWidth, cutDepth) => {
    expect(() => createLRoom({ id: 'l', name: 'L', width: 4, depth: 3, cutWidth, cutDepth, height: 2.6 })).toThrow()
  })
  it('keeps invalid cuts in the draft with a field error and converts all dimensions exactly', () => {
    const input = { ...draft('l'), cutWidth: '4', cutDepth: '3' }
    expect(validateRoomDraft(input)).toMatchObject({ cutWidth: 'cutout', cutDepth: 'cutout' })
    expect(input.cutWidth).toBe('4')
    const cm = { ...draft('l'), unit: 'cm' as const, width: '400', depth: '300', height: '260', cutWidth: '150', cutDepth: '100' }
    expect(project(cm).rooms).toEqual(project(draft('l')).rooms)
    expect(validateRoomDraft({ ...draft(), room2Name: '' })).toMatchObject({ room2Name: 'nameRequired' })
    expect(validateRoomDraft({ ...draft('rectangle'), room2Name: '', width2: 'invalid', cutWidth: 'invalid' })).toEqual({})
  })
  it('keeps labels and furniture inside the concavity rather than in the bounding-box void', () => {
    const room = createLRoom({ id: 'l', name: 'L', width: 4, depth: 4, cutWidth: 3, cutDepth: 3, height: 2.6 }), cell = roomLabelCell(room)
    expect(pointInPolygon({ x: cell.left + cell.width / 2, y: cell.top + cell.depth / 2 }, room.polygon)).toBe(true)
    const item = { id: 'piece', roomId: 'l', catalogId: 'chair', position: { x: 2, y: 2 }, rotation: 0, dimensions: { width: .5, depth: .5, height: .9 }, materialOverrides: {} }
    expect(furnitureFits(item, room)).toBe(false)
    expect(furnitureFits({ ...item, position: { x: .5, y: 2 } }, room)).toBe(true)
  })
})

describe('shared spans and actual open passages', () => {
  it.each(['right', 'below'] as const)('creates two non-overlapping spaces %s with a floor-to-ceiling passage', orientation => {
    const p = project(draft('connected', orientation)), [a, b] = p.rooms, connections = layoutConnections(p.rooms)
    expect(p.schemaVersion).toBe(1); expect(connections).toHaveLength(1)
    expect(connections[0].width).toBe(orientation === 'right' ? 2 : 3)
    expect(a.height).toBe(b.height)
    const models = p.rooms.map(room => buildRoom3D(room, [], p.rooms)), length = models.reduce((sum, model) => sum + model.walls.reduce((sum, wall) => sum + wall.solids.reduce((sum, solid) => sum + solid.size[0], 0), 0), 0)
    expect(length).toBe(24 - connections[0].width * 2)
    const all = meshes(p.rooms), c = connections[0], center = { x: (c.start.x + c.end.x) / 2, y: (c.start.y + c.end.y) / 2 }
    for (const elevation of [.05, 1, 2.55]) {
      const ray = orientation === 'right' ? new Raycaster(new Vector3(center.x - .3, elevation, center.y), new Vector3(1, 0, 0), 0, .6) : new Raycaster(new Vector3(center.x, elevation, center.y - .3), new Vector3(0, 0, 1), 0, .6)
      expect(ray.intersectObjects(all)).toHaveLength(0)
    }
    models.forEach((model, i) => model.corners.forEach(corner => expect(pointInPolygon({ x: corner.solid.center[0], y: corner.solid.center[2] }, p.rooms[1 - i].polygon)).toBe(false)))
    expect(deserializeProject(serializeProject(p))).toEqual(p)
    dispose(all)
  })
  it('splits a partly shared wall and leaves the exterior remainder solid', () => {
    const p = project(), room = p.rooms[0], wall = getWalls(room)[1]
    expect(sharedWallSpans(room, wall, p.rooms)).toEqual([{ start: 0, end: 2, otherRoomId: p.rooms[1].id }])
    expect(visibleWallSpans(room, wall, p.rooms)).toEqual([{ start: 2, end: 3 }])
    const all = meshes(p.rooms)
    expect(new Raycaster(new Vector3(3.7, 1, 2.5), new Vector3(1, 0, 0), 0, .6).intersectObjects(all).length).toBeGreaterThan(0)
    dispose(all)
  })
  it('does not connect gaps, corner contacts or separated rooms', () => {
    const a = createRectangularRoom({ id: 'a', name: 'A', width: 4, depth: 3 })
    for (const origin of [{ x: 4.1, y: 0 }, { x: 4, y: 3 }, { x: -5, y: -5 }]) {
      const b = createRectangularRoom({ id: 'b', name: 'B', width: 2, depth: 2, origin })
      expect(layoutConnections([a, b])).toEqual([])
    }
  })
  it('resolves shared spans with reversed winding and shifted/negative origins', () => {
    const p = project(), rooms = p.rooms.map((room, i) => ({ ...room, polygon: (i ? [...room.polygon].reverse() : room.polygon).map(v => ({ ...v, x: v.x - 8, y: v.y - 4 })) }))
    expect(layoutConnections(rooms)).toHaveLength(1)
    expect(layoutConnections(rooms)[0].width).toBe(2)
    expect(sharedWallSpans(rooms[0], getWalls(rooms[0])[1], rooms)[0]).toMatchObject({ start: 0, end: 2 })
  })
  it('points wall labels into a concave room for either polygon winding', () => {
    const room = lRoom()
    for (const polygon of [room.polygon, [...room.polygon].reverse()]) for (const wall of getWalls({ ...room, polygon })) {
      const normal = wallInward({ ...room, polygon }, wall)
      expect(pointInPolygon({ x: (wall.start.x + wall.end.x) / 2 + normal.x * .01, y: (wall.start.y + wall.end.y) / 2 + normal.y * .01 }, polygon)).toBe(true)
    }
  })
  it('rejects new openings across a passage atomically while allowing exterior openings', () => {
    const p = project(), room = p.rooms[0], wall = getWalls(room)[1], store = createProjectStore()
    store.getState().loadProject(p)
    const opening: Opening = { id: 'door', roomId: room.id, wallId: wall.id, type: 'door', offset: .3, width: .8, height: 2.1, sillHeight: 0 }, before = store.getState().project
    expect(() => store.getState().addOpening(opening)).toThrow(expect.objectContaining({ code: 'opening_in_connection' }))
    expect(store.getState().project).toBe(before)
    const draft = { ...initialOpeningDraft(p, room.id, 'door'), wallId: wall.id, offset: '.3', width: '.8' }
    expect(validateOpeningDraft(draft, p, 'door').issue).toBe('connection')
    const valid = { ...opening, offset: 2.1, width: .8 }
    store.getState().addOpening(valid)
    expect(store.getState().project!.openings).toEqual([valid])
  })
})

describe('new layout persistence', () => {
  it.each(['l', 'right', 'below'] as const)('saves/reopens %s without a schema migration or a second geometry model', async shape => {
    const name = `layouts-${crypto.randomUUID()}`, repo = createProjectRepository(name), store = createProjectStore()
    try {
      let n = 0
      const p = await createRoomProject(draft(shape === 'l' ? 'l' : 'connected', shape === 'below' ? 'below' : 'right'), 'en', { repository: repo, store, id: () => `id-${++n}`, now })
      repo.close()
      const reopened = createProjectRepository(name)
      try { expect(await reopened.get(p.id)).toEqual(p); expect(store.getState().project).toEqual(p) } finally { reopened.close() }
    } finally { repo.close(); await Dexie.delete(name) }
  })
})
