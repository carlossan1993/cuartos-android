import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { createProject, createRectangularRoom, deserializeProject, serializeProject } from '../domain/project'
import type { FurnitureItem, Project } from '../domain/types'
import { FURNITURE_CATALOG } from '../furniture/catalog'
import { beginFurnitureDrag, moveFurnitureDrag } from '../furniture/drag'
import { convertPositionText, furnitureDraft, furnitureFromDraft } from '../furniture/draft'
import { assertFurniturePlacement, furnitureAtPoint, furnitureCorners, furnitureFits, initialPlacement, snapPosition } from '../furniture/geometry'
import { furnitureSymbol } from '../furniture/symbol'
import { getWalls } from '../geometry/rooms'
import { saveFurnitureChange } from '../projects/save-furniture'
import { createProjectStore } from '../state/project-store'
import { createProjectRepository } from '../storage/project-repository'

function fixture(): Project {
  const room = createRectangularRoom({ id: 'room', name: 'Dormitorio', width: 4.2, depth: 3.15 })
  return { ...createProject({ id: 'project', name: 'Casa', language: 'es', now: '2026-10-22T12:00:00.000Z' }), rooms: [room, createRectangularRoom({ id: 'other', name: 'Estudio', width: 2, depth: 2, origin: { x: 5, y: 0 } })], openings: [{ id: 'door', roomId: room.id, wallId: getWalls(room)[0].id, type: 'door', offset: .5, width: .9, height: 2.1, sillHeight: 0 }], furniture: [] }
}
function chair(): FurnitureItem { return { id: 'piece', roomId: 'room', catalogId: 'chair', position: { x: 2, y: 1.5 }, rotation: 0, dimensions: { width: .5, depth: .6, height: .9 }, materialOverrides: { body: { color: '#03038c' } } } }
const now = () => new Date('2026-10-22T22:00:00.000Z'), databases: string[] = []
function repository() { const name = `furniture-${crypto.randomUUID()}`; databases.push(name); return { name, repo: createProjectRepository(name) } }
afterEach(async () => { for (const name of databases.splice(0)) await Dexie.delete(name) })

describe('catalog and footprint geometry', () => {
  it('offers 16 serializable generic pieces with renderable local symbols and fixed dimensions', () => {
    expect(FURNITURE_CATALOG).toHaveLength(16)
    expect(new Set(FURNITURE_CATALOG.map(item => item.catalogId)).size).toBe(16)
    for (const item of FURNITURE_CATALOG) {
      expect(item.resizable).toBe(false)
      expect(item.renderer.kind).toBe('procedural')
      expect(furnitureSymbol(item.renderer.type).length).toBeGreaterThan(1)
      expect([item.dimensions.width, item.dimensions.depth, item.dimensions.height].every(n => n > 0 && Number.isFinite(n))).toBe(true)
    }
  })
  it.each([0, 45, 90, 180, 270, 359])('rotates around the base center without changing its dimensions at %s degrees', rotation => {
    const item = { ...chair(), rotation }, corners = furnitureCorners(item)
    expect(furnitureFits(item, fixture().rooms[0])).toBe(true)
    expect(corners.reduce((s, p) => s + p.x, 0) / 4).toBeCloseTo(item.position.x)
    expect(corners.reduce((s, p) => s + p.y, 0) / 4).toBeCloseTo(item.position.y)
    expect(Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y)).toBeCloseTo(.5)
  })
  it('requires all corners and height to fit, allowing contact with the wall', () => {
    const room = fixture().rooms[0]
    expect(furnitureFits({ ...chair(), position: { x: .25, y: .3 } }, room)).toBe(true)
    expect(furnitureFits({ ...chair(), position: { x: .24, y: .3 } }, room)).toBe(false)
    expect(furnitureFits({ ...chair(), rotation: 45, position: { x: .25, y: .3 } }, room)).toBe(false)
    expect(() => assertFurniturePlacement({ ...chair(), dimensions: { ...chair().dimensions, height: 3 } }, room)).toThrow(expect.objectContaining({ code: 'furniture_height' }))
  })
  it('rejects a rectangle spanning a concave notch even when its center and corners are inside', () => {
    const room = { ...fixture().rooms[0], polygon: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 4, y: 0 }, { id: 'c', x: 4, y: 4 }, { id: 'd', x: 2.5, y: 4 }, { id: 'e', x: 2.5, y: 2 }, { id: 'f', x: 1.5, y: 2 }, { id: 'g', x: 1.5, y: 4 }, { id: 'h', x: 0, y: 4 }] }
    const item = { ...chair(), position: { x: 2, y: 1.9 }, dimensions: { width: 3, depth: 2, height: 1 } }
    expect(furnitureFits(item, room)).toBe(false)
  })
  it('hit-tests the rotated footprint, resolves overlaps by drawing order and supports pixel tolerance', () => {
    const a = { ...chair(), rotation: 90, dimensions: { width: 2, depth: .4, height: 1 } }, b = { ...a, id: 'top' }
    expect(furnitureAtPoint({ x: 2, y: 2.3 }, [a])).toBe(a.id)
    expect(furnitureAtPoint({ x: 2.8, y: 1.5 }, [a])).toBeNull()
    expect(furnitureAtPoint(a.position, [a, b])).toBe('top')
    expect(furnitureAtPoint({ x: 2.24, y: 1.5 }, [a], .05)).toBe(a.id)
  })
  it('finds fitting bounded placements and preserves duplicate dimensions/materials/rotation', () => {
    const room = fixture().rooms[0], item = chair()
    expect(initialPlacement(item, room, .1, true).position).toEqual({ x: 2.1, y: 1.6 })
    const copy = initialPlacement({ ...item, id: 'copy', rotation: 90 }, room, .1, true, true)
    expect(copy).toMatchObject({ id: 'copy', rotation: 90, dimensions: item.dimensions, materialOverrides: item.materialOverrides })
    expect(copy.position).toEqual({ x: 2.2, y: 1.7 })
    expect(() => initialPlacement({ ...item, dimensions: { width: 30, depth: 30, height: 1 } }, room, .1, true)).toThrow()
  })
  it('keeps unlisted/previously out-of-bounds schema 1 records readable and removable', () => {
    const item = { ...chair(), catalogId: 'future-item', position: { x: 100, y: 100 } }, p = { ...fixture(), furniture: [item] }
    expect(deserializeProject(serializeProject(p)).furniture[0]).toEqual(item)
    expect(furnitureSymbol('future-item').length).toBeGreaterThan(0)
    expect(furnitureFits(item, p.rooms[0])).toBe(false)
  })
})

describe('dragging, snapping and precise inputs', () => {
  it('keeps tap jitter and grab offset without moving the camera or the source item', () => {
    const item = chair(), drag = beginFurnitureDrag(7, { x: 110, y: 90 }, item, 100, .1, false)
    expect(moveFurnitureDrag(drag, { x: 113, y: 92 }).candidate).toBe(item)
    const moved = moveFurnitureDrag(drag, { x: 140, y: 110 })
    expect(moved.candidate.position).toEqual({ x: 2.3, y: 1.7 })
    expect(item.position).toEqual({ x: 2, y: 1.5 })
    expect(drag.candidate).toBe(item)
  })
  it.each([30, 300])('has the same world delta at scale %s and only snaps on the requested grid', scale => {
    const start = { x: 100, y: 100 }, item = chair()
    const moved = moveFurnitureDrag(beginFurnitureDrag(1, start, item, scale, .1, true), { x: 100 + .36 * scale, y: 100 + .23 * scale })
    expect(moved.candidate.position).toEqual({ x: 2.4, y: 1.7 })
    expect(snapPosition({ x: -.26, y: .123456789 }, .1, false)).toEqual({ x: -.26, y: .123456789 })
    expect(snapPosition({ x: -.26, y: .26 }, .1, true)).toEqual({ x: -.3, y: .3 })
  })
  it('converts signed cm/m text exactly and normalizes the angle on confirmation', () => {
    expect(convertPositionText('-1.23456789', 'm', 'cm')).toBe('-123.456789')
    expect(convertPositionText('-123.456789', 'cm', 'm')).toBe('-1.23456789')
    expect(convertPositionText('invalid', 'm', 'cm')).toBe('invalid')
    const draft = { ...furnitureDraft(chair()), unit: 'cm' as const, x: '125,5', y: '150', rotation: '-90' }
    expect(furnitureFromDraft(draft, chair(), .1, false)).toMatchObject({ position: { x: 1.255, y: 1.5 }, rotation: 270 })
    expect(furnitureFromDraft({ ...draft, x: 'NaN' }, chair(), .1, false)).toBeNull()
    expect(draft.x).toBe('125,5')
  })
})

describe('atomic furniture saving', () => {
  it('adds, moves, rotates, duplicates and deletes on reopen without changing other data', async () => {
    const { name, repo } = repository(), p = fixture(), store = createProjectStore()
    await repo.create(p); store.getState().loadProject(p)
    await saveFurnitureChange({ type: 'add', catalogId: 'chair', roomId: 'room', id: 'piece', snap: true }, { repository: repo, store, now })
    const added = store.getState().project!.furniture[0]
    await saveFurnitureChange({ type: 'update', item: { ...added, position: { x: 1, y: 1 }, rotation: 450 } }, { repository: repo, store, now })
    await saveFurnitureChange({ type: 'duplicate', sourceId: 'piece', id: 'copy', snap: true }, { repository: repo, store, now })
    await saveFurnitureChange({ type: 'remove', id: 'piece' }, { repository: repo, store, now })
    repo.close()
    const reopened = createProjectRepository(name), saved = await reopened.get(p.id)
    expect(saved.furniture).toHaveLength(1)
    expect(saved.furniture[0]).toMatchObject({ id: 'copy', rotation: 90, position: { x: 1.2, y: 1.2 }, dimensions: added.dimensions })
    expect(saved.rooms).toEqual(p.rooms); expect(saved.openings).toEqual(p.openings)
    expect(saved.schemaVersion).toBe(1)
    expect(Object.isFrozen(store.getState().project!.furniture[0])).toBe(true)
    reopened.close()
  })
  it('rejects invalid footprints and quota failures without changing memory or disk; retries the same change', async () => {
    const { repo } = repository(), p = { ...fixture(), furniture: [chair()] }, store = createProjectStore()
    await repo.create(p); store.getState().loadProject(p)
    const before = store.getState().project, changed = { ...chair(), position: { x: 1, y: 1 } }
    await expect(saveFurnitureChange({ type: 'update', item: { ...changed, position: { x: 0, y: 0 } } }, { repository: repo, store, now })).rejects.toMatchObject({ code: 'furniture_outside_room' })
    await expect(saveFurnitureChange({ type: 'update', item: changed }, { store, now, repository: { replace: async () => { throw new DOMException('Full', 'QuotaExceededError') } } })).rejects.toBeDefined()
    expect(store.getState().project).toBe(before); expect(await repo.get(p.id)).toEqual(p)
    await saveFurnitureChange({ type: 'update', item: changed }, { repository: repo, store, now })
    expect((await repo.get(p.id)).furniture[0].position).toEqual({ x: 1, y: 1 })
    repo.close()
  })
  it('rejects stale writes and keeps unknown catalog items editable with their stored dimensions', async () => {
    const { repo } = repository(), item = { ...chair(), catalogId: 'unknown', dimensions: { width: .7, depth: .8, height: 1.1 } }, p = { ...fixture(), furniture: [item] }, store = createProjectStore()
    await repo.create(p); store.getState().loadProject(p)
    await saveFurnitureChange({ type: 'update', item: { ...item, rotation: 90 } }, { repository: repo, store, now })
    expect((await repo.get(p.id)).furniture[0].dimensions).toEqual(item.dimensions)
    const previous = await repo.get(p.id)
    await repo.replace({ ...previous, name: 'Changed elsewhere' }, previous)
    await expect(saveFurnitureChange({ type: 'remove', id: item.id }, { repository: repo, store, now })).rejects.toMatchObject({ code: 'conflict' })
    expect((await repo.get(p.id)).furniture).toHaveLength(1)
    repo.close()
  })
})
