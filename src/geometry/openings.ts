import type { Opening, Point, Room } from '../domain/types'
import { DomainError } from '../domain/errors'
import { getWalls } from './rooms'

export function openingGeometry(opening: Opening, room: Room) {
  const wall = getWalls(room).find(wall => wall.id === opening.wallId)
  if (!wall || room.id !== opening.roomId) throw new DomainError('invalid_reference', 'wallId', 'unknown opening wall')
  const direction = { x: (wall.end.x - wall.start.x) / wall.length, y: (wall.end.y - wall.start.y) / wall.length }
  const signedArea = room.polygon.reduce((sum, a, i) => { const b = room.polygon[(i + 1) % room.polygon.length]; return sum + a.x * b.y - b.x * a.y }, 0)
  const sign = signedArea > 0 ? 1 : -1
  const inward = { x: -direction.y * sign, y: direction.x * sign }
  const start: Point = { x: wall.start.x + direction.x * opening.offset, y: wall.start.y + direction.y * opening.offset }
  const end: Point = { x: start.x + direction.x * opening.width, y: start.y + direction.y * opening.width }
  const leaf: Point = { x: start.x + inward.x * opening.width, y: start.y + inward.y * opening.width }
  const arc = Array.from({ length: 17 }, (_, i) => {
    const angle = i / 16 * Math.PI / 2
    return { x: start.x + opening.width * (direction.x * Math.cos(angle) + inward.x * Math.sin(angle)), y: start.y + opening.width * (direction.y * Math.cos(angle) + inward.y * Math.sin(angle)) }
  })
  return { start, end, leaf, arc, inward }
}
