import { cloneProject } from '../domain/project'
import type { Project } from '../domain/types'
import { getWalls } from '../geometry/rooms'

/** Copy every owned identifier while preserving catalogue/texture identifiers and measurements. */
export function copyProject(source: Project, name: string, dependencies: { id: () => string; now: () => Date }): Project {
  const original = cloneProject(source), roomIds = new Map<string, string>(), wallIds = new Map<string, string>()
  const rooms = original.rooms.map(room => {
    const id = dependencies.id()
    roomIds.set(room.id, id)
    const next = { ...room, id, polygon: room.polygon.map(vertex => ({ ...vertex, id: dependencies.id() })) }
    const oldWalls = getWalls(room), newWalls = getWalls(next)
    oldWalls.forEach((wall, i) => wallIds.set(wall.id, newWalls[i].id))
    return { ...next, wallMaterials: Object.fromEntries(oldWalls.map(wall => [wallIds.get(wall.id)!, { ...room.wallMaterials[wall.id] }])) }
  })
  const timestamp = dependencies.now().toISOString()
  const copy = { ...original, id: dependencies.id(), name: name.trim(), createdAt: timestamp, updatedAt: timestamp, rooms,
    openings: original.openings.map(opening => ({ ...opening, id: dependencies.id(), roomId: roomIds.get(opening.roomId)!, wallId: wallIds.get(opening.wallId)! })),
    furniture: original.furniture.map(item => ({ ...item, id: dependencies.id(), roomId: roomIds.get(item.roomId)! })),
  }
  const owned = (p: Project) => [p.id, ...p.rooms.flatMap(room => [room.id, ...room.polygon.map(vertex => vertex.id)]), ...p.openings.map(opening => opening.id), ...p.furniture.map(item => item.id)]
  const oldIds = new Set(owned(original))
  if (owned(copy).some(id => oldIds.has(id))) throw new Error('Copy ID generator reused a source identifier')
  return cloneProject(copy)
}
