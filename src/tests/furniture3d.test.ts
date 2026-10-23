import { describe, expect, it } from 'vitest'
import { Box3, Color, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import type { FurnitureItem } from '../domain/types'
import { createProject, createRectangularRoom, deserializeProject, serializeProject } from '../domain/project'
import { FURNITURE_CATALOG } from '../furniture/catalog'
import { furnitureCorners } from '../furniture/geometry'
import { buildFurniture3D, buildFurnitureSet3D, MAX_FURNITURE_VERTICES } from '../furniture/model3d'
import { furnitureGeometry } from '../viewer3d/furniture-geometry'
import { sceneBounds } from '../viewer3d/model'

function item(catalogId = 'dining-table'): FurnitureItem {
  const entry = FURNITURE_CATALOG.find(entry => entry.catalogId === catalogId)!
  return { id: 'piece', roomId: 'room', catalogId, position: { x: 2, y: 3 }, rotation: 0, dimensions: { ...entry.dimensions }, materialOverrides: {} }
}
function meshFor(source: FurnitureItem) {
  const model = buildFurniture3D(source), mesh = new Mesh(furnitureGeometry(model), new MeshBasicMaterial({ vertexColors: true }))
  mesh.position.set(...model.position); mesh.rotation.y = model.rotationY; mesh.updateMatrixWorld()
  return mesh
}
function dispose(mesh: ReturnType<typeof meshFor>) { mesh.geometry.dispose(); mesh.material.dispose() }

describe('procedural catalog geometry', () => {
  it.each(FURNITURE_CATALOG.map(entry => entry.catalogId))('keeps real stored dimensions and floor contact for %s', id => {
    const source = { ...item(id), dimensions: { width: 1.31, depth: .83, height: 1.17 } }, model = buildFurniture3D(source), geometry = furnitureGeometry(model)
    const bounds = geometry.boundingBox!, size = bounds.getSize(new Vector3())
    expect(size.x).toBeCloseTo(1.31, 5); expect(size.y).toBeCloseTo(1.17, 5); expect(size.z).toBeCloseTo(.83, 5)
    expect(bounds.min.y).toBeCloseTo(0, 6)
    expect(bounds.getCenter(new Vector3()).x).toBeCloseTo(0, 6); expect(bounds.getCenter(new Vector3()).z).toBeCloseTo(0, 6)
    expect(model.parts.length).toBeGreaterThan(1)
    expect(geometry.getAttribute('position').count).toBeLessThan(6000)
    expect(geometry.getAttribute('color').count).toBe(geometry.getAttribute('position').count)
    expect([...geometry.getAttribute('normal').array].every(Number.isFinite)).toBe(true)
    expect(geometry.groups).toEqual([]) // one material/draw call, not one per part
    geometry.dispose()
  })
  it.each([0, 35, 90, 180, 270, 359])('matches the 2D rotated footprint around the stored center at %s°', rotation => {
    const source = { ...item(), rotation, position: { x: -8.3, y: 7.2 } }, mesh = meshFor(source)
    const bounds = new Box3().setFromObject(mesh), corners = furnitureCorners(source)
    expect(bounds.min.x).toBeCloseTo(Math.min(...corners.map(p => p.x)), 5)
    expect(bounds.max.x).toBeCloseTo(Math.max(...corners.map(p => p.x)), 5)
    expect(bounds.min.z).toBeCloseTo(Math.min(...corners.map(p => p.y)), 5)
    expect(bounds.max.z).toBeCloseTo(Math.max(...corners.map(p => p.y)), 5)
    expect(bounds.min.y).toBeCloseTo(0, 5); expect(bounds.max.y).toBeCloseTo(source.dimensions.height, 5)
    dispose(mesh)
  })
  it('leaves real open space under a table and between chair seat and back', () => {
    const table = meshFor({ ...item(), position: { x: 0, y: 0 } })
    expect(new Raycaster(new Vector3(0, .25, 2), new Vector3(0, 0, -1)).intersectObject(table)).toHaveLength(0)
    expect(new Raycaster(new Vector3(0, 2, 0), new Vector3(0, -1, 0)).intersectObject(table).length).toBeGreaterThan(0)
    const legX = -.41 * item().dimensions.width
    expect(new Raycaster(new Vector3(legX, .2, 2), new Vector3(0, 0, -1)).intersectObject(table).length).toBeGreaterThan(0)
    const chair = meshFor({ ...item('chair'), position: { x: 0, y: 0 } })
    expect(new Raycaster(new Vector3(0, 2, .15), new Vector3(0, -1, 0)).intersectObject(chair)[0].point.y).toBeCloseTo(.9 * .58, 5)
    dispose(table); dispose(chair)
  })
  it('keeps bookshelf bays open in front of the back panel', () => {
    const mesh = meshFor({ ...item('bookshelf'), position: { x: 0, y: 0 } })
    expect(new Raycaster(new Vector3(0, .7, .3), new Vector3(0, 0, -1), 0, .25).intersectObject(mesh)).toHaveLength(0)
    expect(new Raycaster(new Vector3(0, .7, .3), new Vector3(0, 0, -1)).intersectObject(mesh).length).toBeGreaterThan(0)
    dispose(mesh)
  })
  it.each(['sink', 'toilet'])('uses a real open rim for %s rather than a painted ellipse', id => {
    const model = buildFurniture3D(item(id)), rim = model.parts.find(part => part.shape === 'ring')!
    const geometry = furnitureGeometry({ ...model, parts: [rim] }), material = new MeshBasicMaterial(), mesh = new Mesh(geometry, material)
    mesh.updateMatrixWorld()
    const [x, , z] = rim.center
    expect(new Raycaster(new Vector3(x, 3, z), new Vector3(0, -1, 0)).intersectObject(mesh)).toHaveLength(0)
    expect(new Raycaster(new Vector3(x + rim.size[0] * .42, 3, z), new Vector3(0, -1, 0)).intersectObject(mesh).length).toBeGreaterThan(0)
    geometry.dispose(); material.dispose()
  })
  it('applies role colors in linear vertex space while preserving unknown texture/override data', () => {
    const source = { ...item('bed-single'), materialOverrides: { body: { color: '#03038c', textureId: 'future-wood' }, fabric: { color: '#c02222' }, unused: { color: '#abcdef' } } }, before = JSON.stringify(source)
    const model = buildFurniture3D(source), blue = model.parts.find(part => part.role === 'body')!
    const geometry = furnitureGeometry({ ...model, parts: [blue] }), colors = geometry.getAttribute('color'), expected = new Color('#03038c')
    expect(colors.getX(0)).toBeCloseTo(expected.r, 6); expect(colors.getY(0)).toBeCloseTo(expected.g, 6); expect(colors.getZ(0)).toBeCloseTo(expected.b, 6)
    expect(model.parts.filter(part => part.role === 'fabric').every(part => part.color === '#c02222')).toBe(true)
    expect(model.parts.find(part => part.role === 'pillows')!.color).not.toBe('#03038c')
    expect(JSON.stringify(source)).toBe(before)
    geometry.dispose()
  })
  it('keeps legacy and unknown furniture in the camera bounds without changing schema or JSON', () => {
    const unknown = { ...item('chair'), catalogId: 'future-chair', position: { x: -8, y: 5 }, dimensions: { width: 2, depth: 1, height: 3 } }
    const project = { ...createProject({ id: 'p', name: 'Casa', language: 'es', now: '2026-10-23T12:00:00.000Z' }), rooms: [createRectangularRoom({ id: 'room', name: 'Uno', width: 4, depth: 3 })], furniture: [unknown] }
    const before = serializeProject(project), geometry = furnitureGeometry(buildFurniture3D(unknown)), bounds = sceneBounds(project)
    expect(geometry.boundingBox!.getSize(new Vector3()).toArray()).toEqual([2, 3, 1])
    expect(bounds.center[0] - bounds.size[0] / 2).toBeCloseTo(-9)
    expect(bounds.center[2] + bounds.size[2] / 2).toBeCloseTo(5.5)
    expect(bounds.size[1]).toBeCloseTo(3.08)
    expect(deserializeProject(before).furniture[0]).toEqual(unknown)
    expect(serializeProject(project)).toBe(before)
    geometry.dispose()
  })
  it('bounds aggregate geometry before allocating GPU buffers', () => {
    expect(MAX_FURNITURE_VERTICES).toBe(600_000)
    expect(buildFurnitureSet3D(Array.from({ length: 16 }, (_, i) => ({ ...item(), id: `item-${i}` })))).toHaveLength(16)
    expect(() => buildFurnitureSet3D(Array.from({ length: 2000 }, (_, i) => ({ ...item('toilet'), id: `item-${i}` })))).toThrow('budget exceeded')
  })
})
