import { EPSILON, assertOrthogonalPolygon, getWalls } from '../geometry/rooms'
import { DomainError } from './errors'
import { SCHEMA_VERSION, type Project, type Room } from './types'

function invalid(path: string, detail: string): never { throw new DomainError('invalid_value', path, detail) }

function object(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Object.getOwnPropertySymbols(value).length) invalid(path, 'expected plain data object')
  const record = value as Record<string, unknown>
  if (required.some(key => !Object.hasOwn(record, key))) invalid(path, 'missing field')
  const allowed = new Set([...required, ...optional])
  if (Object.keys(record).some(key => !allowed.has(key))) invalid(path, 'unexpected field')
  return record
}

function text(value: unknown, path: string, max = 120): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) invalid(path, 'expected non-empty bounded string')
}
function id(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/.test(value)) invalid(path, 'invalid identifier')
}
function number(value: unknown, path: string, min: number, max = 10_000): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid(path, 'number out of range')
}
function positive(value: unknown, path: string): void { number(value, path, 0.000001) }
function flag(value: unknown, path: string): void { if (typeof value !== 'boolean') invalid(path, 'expected boolean') }
function list(value: unknown, path: string, max: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > max) invalid(path, 'expected bounded array')
  if (Object.keys(value).length !== value.length || Object.getOwnPropertySymbols(value).length) invalid(path, 'expected dense JSON array')
  for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i)) invalid(path, 'sparse array')
}
function point(value: unknown, path: string, world = false): void {
  const v = object(value, path, world ? ['x', 'y', 'z'] : ['x', 'y'])
  Object.entries(v).forEach(([key, n]) => number(n, `${path}.${key}`, -10_000))
}
function material(value: unknown, path: string): void {
  const v = object(value, path, ['color'], ['textureId'])
  if (typeof v.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(v.color)) invalid(`${path}.color`, 'expected hex color')
  if (Object.hasOwn(v, 'textureId')) id(v.textureId, `${path}.textureId`)
}
function materials(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(path, 'expected material map')
  const v = value as Record<string, unknown>
  if (Object.keys(v).length > 256) invalid(path, 'too many materials')
  for (const [key, item] of Object.entries(v)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') invalid(path, 'invalid part identifier')
    text(key, path, 300)
    material(item, `${path}.${key}`)
  }
  return v
}
function dimensions(value: unknown, path: string): void {
  const v = object(value, path, ['width', 'depth', 'height'])
  Object.entries(v).forEach(([key, n]) => positive(n, `${path}.${key}`))
}
function timestamp(value: unknown, path: string): void {
  text(value, path, 30)
  const time = Date.parse(value)
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) invalid(path, 'expected canonical ISO timestamp')
}

export function assertRoom(value: unknown, path = 'room'): asserts value is Room {
  const v = object(value, path, ['id', 'name', 'polygon', 'height', 'wallThickness', 'floorMaterial', 'wallMaterials'])
  id(v.id, `${path}.id`); text(v.name, `${path}.name`)
  positive(v.height, `${path}.height`); positive(v.wallThickness, `${path}.wallThickness`)
  list(v.polygon, `${path}.polygon`, 64)
  const ids = new Set<string>()
  v.polygon.forEach((vertex, index) => {
    const at = `${path}.polygon.${index}`
    const p = object(vertex, at, ['id', 'x', 'y'])
    id(p.id, `${at}.id`)
    if (ids.has(p.id)) invalid(at, 'duplicate vertex identifier')
    ids.add(p.id)
    number(p.x, `${at}.x`, -10_000); number(p.y, `${at}.y`, -10_000)
  })
  try { assertOrthogonalPolygon(v.polygon as Room['polygon']) } catch (error) {
    if (error instanceof DomainError) throw new DomainError(error.code, `${path}.polygon`, error.message)
    throw error
  }
  material(v.floorMaterial, `${path}.floorMaterial`)
  const overrides = materials(v.wallMaterials, `${path}.wallMaterials`)
  const walls = new Set(getWalls(value as Room).map(wall => wall.id))
  if (Object.keys(overrides).length !== walls.size) invalid(`${path}.wallMaterials`, 'every wall requires a material')
  for (const wallId of Object.keys(overrides)) if (!walls.has(wallId)) throw new DomainError('invalid_reference', `${path}.wallMaterials`, 'unknown wall')
}

export function assertProject(value: unknown): asserts value is Project {
  const v = object(value, 'project', ['id', 'name', 'schemaVersion', 'createdAt', 'updatedAt', 'languageMetadata', 'rooms', 'openings', 'furniture', 'viewSettings'])
  if (v.schemaVersion !== SCHEMA_VERSION) throw new DomainError('unsupported_schema', 'schemaVersion', 'unsupported project version')
  id(v.id, 'id'); text(v.name, 'name')
  timestamp(v.createdAt, 'createdAt'); timestamp(v.updatedAt, 'updatedAt')
  if (Date.parse(String(v.updatedAt)) < Date.parse(String(v.createdAt))) invalid('updatedAt', 'must not precede creation')
  const language = object(v.languageMetadata, 'languageMetadata', ['createdWith'])
  if (language.createdWith !== 'es' && language.createdWith !== 'en') invalid('languageMetadata.createdWith', 'unsupported language')
  list(v.rooms, 'rooms', 2); list(v.openings, 'openings', 256); list(v.furniture, 'furniture', 2_000)
  v.rooms.forEach((room, i) => assertRoom(room, `rooms.${i}`))
  const project = value as Project
  const seen = new Set([project.id])
  const unique = (entityId: unknown, path: string) => {
    id(entityId, path)
    if (seen.has(entityId)) invalid(path, 'duplicate entity identifier')
    seen.add(entityId)
  }
  project.rooms.forEach((room, i) => unique(room.id, `rooms.${i}.id`))
  const roomFor = (roomId: unknown, path: string): Room => {
    id(roomId, path)
    const room = project.rooms.find(item => item.id === roomId)
    if (!room) throw new DomainError('invalid_reference', path, 'unknown room')
    return room
  }
  v.openings.forEach((opening, i) => {
    const path = `openings.${i}`
    const o = object(opening, path, ['id', 'roomId', 'type', 'wallId', 'offset', 'width', 'height', 'sillHeight'])
    unique(o.id, `${path}.id`)
    const room = roomFor(o.roomId, `${path}.roomId`)
    if (o.type !== 'door' && o.type !== 'window') invalid(`${path}.type`, 'unsupported opening')
    text(o.wallId, `${path}.wallId`, 300)
    const wall = getWalls(room).find(item => item.id === o.wallId)
    if (!wall) throw new DomainError('invalid_reference', `${path}.wallId`, 'unknown directed wall')
    number(o.offset, `${path}.offset`, 0); positive(o.width, `${path}.width`)
    positive(o.height, `${path}.height`); number(o.sillHeight, `${path}.sillHeight`, 0)
    const typed = opening as Project['openings'][number]
    if (typed.offset + typed.width > wall.length + EPSILON) throw new DomainError('opening_outside_wall', path, 'opening exceeds wall length')
    if (typed.sillHeight + typed.height > room.height + EPSILON) throw new DomainError('opening_outside_height', path, 'opening exceeds room height')
    if (typed.type === 'door' && typed.sillHeight !== 0) throw new DomainError('door_above_floor', path, 'door must start at floor level')
  })
  for (let i = 0; i < project.openings.length; i++) {
    const a = project.openings[i]
    for (const b of project.openings.slice(i + 1)) {
      if (a.roomId === b.roomId && a.wallId === b.wallId &&
        Math.min(a.offset + a.width, b.offset + b.width) - Math.max(a.offset, b.offset) > EPSILON &&
        Math.min(a.sillHeight + a.height, b.sillHeight + b.height) - Math.max(a.sillHeight, b.sillHeight) > EPSILON) throw new DomainError('opening_overlap', 'openings', 'overlapping wall openings')
    }
  }
  v.furniture.forEach((item, i) => {
    const path = `furniture.${i}`
    const f = object(item, path, ['id', 'roomId', 'catalogId', 'position', 'rotation', 'dimensions', 'materialOverrides'])
    unique(f.id, `${path}.id`); roomFor(f.roomId, `${path}.roomId`); id(f.catalogId, `${path}.catalogId`)
    point(f.position, `${path}.position`); dimensions(f.dimensions, `${path}.dimensions`)
    number(f.rotation, `${path}.rotation`, 0, 360)
    if (f.rotation === 360) invalid(`${path}.rotation`, 'rotation must be normalized')
    materials(f.materialOverrides, `${path}.materialOverrides`)
  })
  const view = object(v.viewSettings, 'viewSettings', ['grid', 'snap', 'gridSize', 'zoom2d', 'camera3d'])
  flag(view.grid, 'viewSettings.grid'); flag(view.snap, 'viewSettings.snap')
  positive(view.gridSize, 'viewSettings.gridSize'); number(view.zoom2d, 'viewSettings.zoom2d', 0.05, 50)
  const camera = object(view.camera3d, 'viewSettings.camera3d', ['position', 'target'])
  point(camera.position, 'camera.position', true); point(camera.target, 'camera.target', true)
  const c = project.viewSettings.camera3d
  if (c.position.x === c.target.x && c.position.y === c.target.y && c.position.z === c.target.z) invalid('camera3d', 'camera position and target must differ')
}
