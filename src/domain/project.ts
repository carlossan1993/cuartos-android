import { getWalls } from '../geometry/rooms'
import { DomainError } from './errors'
import { SCHEMA_VERSION, type Point, type Project, type Room } from './types'
import { assertProject, assertRoom } from './validation'

export const MAX_PROJECT_JSON_BYTES = 2 * 1024 * 1024

export function createProject(input: { id: string; name: string; language: 'es' | 'en'; now: string }): Project {
  const project: Project = {
    id: input.id, name: input.name.trim(), schemaVersion: SCHEMA_VERSION,
    createdAt: input.now, updatedAt: input.now,
    languageMetadata: { createdWith: input.language },
    rooms: [], openings: [], furniture: [],
    viewSettings: {
      grid: true, snap: true, gridSize: 0.1, zoom2d: 1,
      camera3d: { position: { x: 6, y: 6, z: 6 }, target: { x: 0, y: 0, z: 0 } },
    },
  }
  assertProject(project)
  return project
}

export function createRectangularRoom(input: {
  id: string; name: string; width: number; depth: number; height?: number; wallThickness?: number; origin?: Point
}): Room {
  // Validate lengths before constructing coordinates: two negative lengths
  // would otherwise describe a perfectly valid but unintended rectangle.
  for (const [key, value] of Object.entries({ width: input.width, depth: input.depth })) {
    if (!Number.isFinite(value) || value < 0.000001) throw new DomainError('invalid_value', key, 'expected positive metres')
  }
  const origin = input.origin ?? { x: 0, y: 0 }
  const room: Room = {
    id: input.id, name: input.name.trim(),
    polygon: [
      { id: 'a', x: origin.x, y: origin.y },
      { id: 'b', x: origin.x + input.width, y: origin.y },
      { id: 'c', x: origin.x + input.width, y: origin.y + input.depth },
      { id: 'd', x: origin.x, y: origin.y + input.depth },
    ],
    height: input.height ?? 2.6, wallThickness: input.wallThickness ?? 0.12,
    floorMaterial: { color: '#f2eee5' }, wallMaterials: {},
  }
  const complete = { ...room, wallMaterials: Object.fromEntries(getWalls(room).map(wall => [wall.id, { color: '#ffffff' }])) }
  assertRoom(complete)
  return complete
}

export function serializeProject(project: Project): string {
  assertProject(project)
  const json = JSON.stringify(project)
  if (new TextEncoder().encode(json).byteLength > MAX_PROJECT_JSON_BYTES) throw new DomainError('file_too_large', 'project', 'project exceeds 2 MiB')
  return json
}

export function deserializeProject(json: string): Project {
  if (typeof json !== 'string') throw new DomainError('invalid_json', 'project', 'expected JSON text')
  if (new TextEncoder().encode(json).byteLength > MAX_PROJECT_JSON_BYTES) throw new DomainError('file_too_large', 'project', 'project exceeds 2 MiB')
  let project: unknown
  try { project = JSON.parse(json) } catch { throw new DomainError('invalid_json', 'project', 'invalid JSON') }
  assertProject(project)
  return project
}

export function cloneProject(project: Project): Project {
  return deserializeProject(serializeProject(project))
}
