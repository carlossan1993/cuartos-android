import { describe, expect, it } from 'vitest'
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { createProject, createRectangularRoom, serializeProject } from '../domain/project'
import type { Opening, Project } from '../domain/types'
import { getWalls, polygonArea } from '../geometry/rooms'
import { fitDistance, cameraLimits } from '../viewer3d/camera'
import { floorGeometry, solidGeometry } from '../viewer3d/geometry'
import { buildRoom3D, FLOOR_DEPTH, MAX_WALL_SOLIDS, sceneBounds, wallFacesCamera } from '../viewer3d/model'

function fixture(): Project {
  return { ...createProject({ id: 'project', name: 'Casa', language: 'es', now: '2026-10-22T12:00:00.000Z' }), rooms: [createRectangularRoom({ id: 'room', name: 'Dormitorio', width: 4.2, depth: 3.15 })] }
}
function opening(index = 0, extra: Partial<Opening> = {}): Opening { return { id: 'door', roomId: 'room', wallId: getWalls(fixture().rooms[0])[index].id, type: 'door', offset: .5, width: .9, height: 2.1, sillHeight: 0, ...extra } }

describe('true wall solids and opening geometry', () => {
  it.each([0, 1, 2, 3])('preserves opening size and outward wall thickness on directed wall %s', index => {
    const room = fixture().rooms[0], apertures = [opening(index)], model = buildRoom3D(room, apertures), wall = model.walls[index]
    const volume = wall.solids.reduce((sum, solid) => sum + solid.size[0] * solid.size[1] * solid.size[2], 0)
    expect(volume).toBeCloseTo((getWalls(room)[index].length * room.height - .9 * 2.1) * room.wallThickness)
    const mesh = new Mesh(solidGeometry(wall.solids), new MeshBasicMaterial())
    mesh.updateMatrixWorld()
    const edge = getWalls(room)[index], u = { x: (edge.end.x - edge.start.x) / edge.length, y: (edge.end.y - edge.start.y) / edge.length }
    function hits(offset: number, elevation: number) {
      const x = edge.start.x + u.x * offset + wall.outward.x, z = edge.start.y + u.y * offset + wall.outward.y
      return new Raycaster(new Vector3(x, elevation, z), new Vector3(-wall.outward.x, 0, -wall.outward.y), 0, 2).intersectObject(mesh).length
    }
    expect(hits(.95, 1)).toBe(0) // a real hole, not a painted rectangle
    expect(hits(.2, 1)).toBeGreaterThan(0)
    expect(hits(.95, 2.4)).toBeGreaterThan(0)
    expect(wall.openings[0].solid.size).toEqual([.9, 2.1, .035])
    mesh.geometry.dispose(); (mesh.material as MeshBasicMaterial).dispose()
  })
  it('keeps the wall below a window and carves the exact sill/height range', () => {
    const room = fixture().rooms[0], window = opening(0, { type: 'window', sillHeight: 1, height: 1.2 }), wall = buildRoom3D(room, [window]).walls[0]
    const middle = wall.solids.filter(solid => Math.abs(solid.center[0] - .95) < .001)
    expect(middle).toHaveLength(2)
    expect(middle[0].center[1]).toBeCloseTo(.5); expect(middle[0].size[1]).toBeCloseTo(1)
    expect(middle[1].center[1]).toBeCloseTo(2.4); expect(middle[1].size[1]).toBeCloseTo(.4)
    expect(wall.openings[0].solid.center[1]).toBe(1.6)
    expect(wall.openings[0].solid.center[2]).toBeCloseTo(-room.wallThickness / 2)
  })
  it('supports adjacent and vertically stacked openings without filling or doubling the gaps', () => {
    const room = fixture().rooms[0], apertures = [opening(), opening(0, { id: 'above', type: 'window', sillHeight: 2.2, height: .3 }), opening(0, { id: 'adjacent', offset: 1.4 })]
    const wall = buildRoom3D(room, apertures).walls[0]
    const area = apertures.reduce((s, o) => s + o.width * o.height, 0)
    expect(wall.solids.reduce((s, solid) => s + solid.size[0] * solid.size[1], 0)).toBeCloseTo(4.2 * 2.6 - area)
    expect(wall.solids.every(solid => solid.size.every(n => n > 0))).toBe(true)
  })
  it('handles a full wall opening, convex corner joins and changed starting vertices', () => {
    const room = fixture().rooms[0], rotated = { ...room, polygon: [...room.polygon.slice(1), room.polygon[0]] }, aperture = opening(0, { offset: 0, width: 4.2, height: 2.6 })
    const model = buildRoom3D(room, [aperture])
    expect(model.walls[0].solids).toEqual([])
    expect(model.corners).toHaveLength(4)
    expect(buildRoom3D(rotated, [aperture]).walls.find(w => w.id === aperture.wallId)).toEqual(model.walls[0])
    const corner = model.corners.find(c => c.solid.center[0] < 0 && c.solid.center[2] < 0)!
    expect(corner.solid.center).toEqual([-.06, 1.3, -.06])
  })
  it('uses room and wall IDs to isolate openings and preserves materials and the input JSON', () => {
    const p = fixture(), original = p.rooms[0], other = createRectangularRoom({ id: 'other', name: 'Estudio', width: 2, depth: 2, origin: { x: 8, y: 0 } })
    const room = { ...original, floorMaterial: { color: '#c39a68', textureId: 'floor-planks' }, wallMaterials: { ...original.wallMaterials, [getWalls(original)[0].id]: { color: '#03038c' } } }
    const project = { ...p, rooms: [room, other], openings: [opening()] }, before = serializeProject(project)
    expect(buildRoom3D(room, project.openings).walls[0].material.color).toBe('#03038c')
    expect(buildRoom3D(other, project.openings).walls.every(w => !w.openings.length)).toBe(true)
    expect(serializeProject(project)).toBe(before)
  })
  it('bounds pathological subdivisions instead of allocating unlimited GPU geometry', () => {
    const room = fixture().rooms[0]
    const apertures = Array.from({ length: 256 }, (_, i) => opening(0, { id: `w${i}`, type: 'window', offset: .1 + i * .002, width: 1, sillHeight: i * .009, height: .005 }))
    expect(MAX_WALL_SOLIDS).toBe(4096)
    expect(() => buildRoom3D(room, apertures)).toThrow('budget exceeded')
  })
})

describe('floor mesh, bounds and camera', () => {
  it.each([false, true])('builds the real polygon floor with upward top faces and slab depth (concave=%s)', concave => {
    const original = fixture().rooms[0], room = concave ? { ...original, polygon: [{ id: 'a', x: -2, y: -1 }, { id: 'b', x: 2, y: -1 }, { id: 'c', x: 2, y: 1 }, { id: 'd', x: 0, y: 1 }, { id: 'e', x: 0, y: 3 }, { id: 'f', x: -2, y: 3 }] } : original
    const geometry = floorGeometry(room), positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.min.y).toBeCloseTo(-FLOOR_DEPTH)
    expect(geometry.boundingBox!.max.y).toBeCloseTo(0)
    expect(geometry.boundingBox!.min.z).toBeCloseTo(Math.min(...room.polygon.map(p => p.y)))
    let topArea = 0
    for (let i = 0; i < positions.count; i += 3) {
      if ([i, i + 1, i + 2].every(j => Math.abs(positions.getY(j)) < 1e-6) && normals.getY(i) > .9) {
        const a = new Vector3().fromBufferAttribute(positions, i), b = new Vector3().fromBufferAttribute(positions, i + 1), c = new Vector3().fromBufferAttribute(positions, i + 2)
        topArea += b.sub(a).cross(c.sub(a)).length() / 2
      }
    }
    expect(topArea).toBeCloseTo(polygonArea(room.polygon), 5)
    geometry.dispose()
  })
  it('keeps camera bounds inclusive of height, thickness and all room origins', () => {
    const p = fixture(), bounds = sceneBounds(p)
    expect(bounds.size).toEqual([4.44, 2.68, 3.39])
    expect(bounds.center).toEqual([2.1, 1.26, 1.575])
    expect(fitDistance(bounds, .5)).toBeGreaterThan(fitDistance(bounds, 1.5))
    const limits = cameraLimits(bounds)
    expect(limits.near).toBeGreaterThan(0)
    expect(limits.far).toBeGreaterThan(limits.maxDistance)
    const other = createRectangularRoom({ id: 'other', name: 'Otro', width: 2, depth: 3, origin: { x: -9, y: -7 } })
    expect(sceneBounds({ ...p, rooms: [...p.rooms, other] }).center[0]).toBeLessThan(0)
  })
  it('hides only camera-facing walls for cutaway and handles a blank project', () => {
    const walls = buildRoom3D(fixture().rooms[0], []).walls
    expect(walls.map(wall => wallFacesCamera(wall, 10, 10))).toEqual([false, true, true, false])
    expect(walls.map(wall => wallFacesCamera(wall, -10, -10))).toEqual([true, false, false, true])
    expect(sceneBounds({ ...fixture(), rooms: [] }).radius).toBeGreaterThan(0)
  })
})
