import { createRectangularRoom } from '../domain/project'
import type { Room } from '../domain/types'
import { assertRoom } from '../domain/validation'
import { getWalls } from '../geometry/rooms'

export type LayoutShape = 'rectangle' | 'l' | 'connected'
export function createLRoom(input: { id: string; name: string; width: number; depth: number; height: number; cutWidth: number; cutDepth: number }): Room {
  const base = createRectangularRoom(input), { width: w, depth: d, cutWidth: cw, cutDepth: cd } = input
  if (![cw, cd].every(Number.isFinite) || cw <= 0 || cd <= 0 || cw >= w || cd >= d) throw new Error('Invalid L cutout')
  const polygon = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: w, y: 0 }, { id: 'c', x: w, y: d - cd }, { id: 'd', x: w - cw, y: d - cd }, { id: 'e', x: w - cw, y: d }, { id: 'f', x: 0, y: d }]
  const room = { ...base, polygon }
  const complete = { ...room, wallMaterials: Object.fromEntries(getWalls(room).map(wall => [wall.id, { color: '#ffffff' }])) }
  assertRoom(complete)
  return complete
}
