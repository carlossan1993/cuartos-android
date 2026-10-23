import { DomainError } from '../domain/errors'
import type { Project, Room, SurfaceMaterial } from '../domain/types'
import { assertRoom } from '../domain/validation'
import { getWalls } from '../geometry/rooms'

export type FinishTarget = { kind: 'floor' } | { kind: 'allWalls' } | { kind: 'wall'; wallId: string }
export function roomWithFinish(project: Project, roomId: string, target: FinishTarget, material: SurfaceMaterial): Room {
  const room = project.rooms.find(room => room.id === roomId)
  if (!room) throw new DomainError('invalid_reference', 'roomId', 'unknown finish room')
  let next: Room
  if (target.kind === 'floor') next = { ...room, floorMaterial: { ...material } }
  else if (target.kind === 'allWalls') next = { ...room, wallMaterials: Object.fromEntries(getWalls(room).map(wall => [wall.id, { ...material }])) }
  else if (target.kind === 'wall' && getWalls(room).some(wall => wall.id === target.wallId)) next = { ...room, wallMaterials: { ...room.wallMaterials, [target.wallId]: { ...material } } }
  else throw new DomainError('invalid_reference', 'wallId', 'unknown finish wall')
  assertRoom(next)
  return next
}
