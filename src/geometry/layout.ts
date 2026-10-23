import type { Opening, Point, Project, Room } from '../domain/types'
import { DomainError } from '../domain/errors'
import { EPSILON, getWalls, pointInPolygon, type Wall } from './rooms'

export interface WallSpan { start: number; end: number }
export interface SharedSpan extends WallSpan { otherRoomId: string }
function winding(room: Room) {
  return Math.sign(room.polygon.reduce((sum, a, i) => { const b = room.polygon[(i + 1) % room.polygon.length]; return sum + a.x * b.y - b.x * a.y }, 0))
}

/** Touching, opposite-facing edges define open connections; no extra persisted state. */
export function sharedWallSpans(room: Room, wall: Wall, rooms: readonly Room[]): readonly SharedSpan[] {
  const dx = (wall.end.x - wall.start.x) / wall.length, dy = (wall.end.y - wall.start.y) / wall.length
  const spans: SharedSpan[] = []
  for (const other of rooms) {
    if (other.id === room.id) continue
    for (const edge of getWalls(other)) {
      const ex = (edge.end.x - edge.start.x) / edge.length, ey = (edge.end.y - edge.start.y) / edge.length
      if ((dx * ex + dy * ey) * winding(room) * winding(other) > -.99) continue
      if (Math.abs((edge.start.x - wall.start.x) * dy - (edge.start.y - wall.start.y) * dx) > EPSILON) continue
      const a = (edge.start.x - wall.start.x) * dx + (edge.start.y - wall.start.y) * dy
      const b = (edge.end.x - wall.start.x) * dx + (edge.end.y - wall.start.y) * dy
      const start = Math.max(0, Math.min(a, b)), end = Math.min(wall.length, Math.max(a, b))
      if (end - start > EPSILON) spans.push({ start, end, otherRoomId: other.id })
    }
  }
  return spans.sort((a, b) => a.start - b.start)
}

export function visibleWallSpans(room: Room, wall: Wall, rooms: readonly Room[]): readonly WallSpan[] {
  const result: WallSpan[] = []
  let start = 0
  for (const shared of sharedWallSpans(room, wall, rooms)) {
    if (shared.start - start > EPSILON) result.push({ start, end: shared.start })
    start = Math.max(start, shared.end)
  }
  if (wall.length - start > EPSILON) result.push({ start, end: wall.length })
  return result
}

export function wallPoint(wall: Wall, offset: number): Point {
  return { x: wall.start.x + (wall.end.x - wall.start.x) * offset / wall.length, y: wall.start.y + (wall.end.y - wall.start.y) * offset / wall.length }
}

export function layoutConnections(rooms: readonly Room[]) {
  return rooms.flatMap(room => getWalls(room).flatMap(wall => sharedWallSpans(room, wall, rooms).filter(span => room.id < span.otherRoomId).map(span => ({ roomId: room.id, otherRoomId: span.otherRoomId, width: span.end - span.start, start: wallPoint(wall, span.start), end: wallPoint(wall, span.end) }))))
}

/** A rectangular cell strictly inside the polygon, for labels in a concave room. */
export function roomLabelCell(room: Pick<Room, 'polygon'>) {
  const xs = [...new Set(room.polygon.map(p => p.x))].sort((a, b) => a - b), ys = [...new Set(room.polygon.map(p => p.y))].sort((a, b) => a - b)
  let best = { left: xs[0], top: ys[0], width: 0, depth: 0 }
  for (let x = 0; x < xs.length - 1; x++) for (let y = 0; y < ys.length - 1; y++) {
    const width = xs[x + 1] - xs[x], depth = ys[y + 1] - ys[y]
    if (width * depth > best.width * best.depth && pointInPolygon({ x: xs[x] + width / 2, y: ys[y] + depth / 2 }, room.polygon)) best = { left: xs[x], top: ys[y], width, depth }
  }
  return best
}

export function assertOpeningOutsideConnection(opening: Opening, project: Project) {
  const room = project.rooms.find(room => room.id === opening.roomId), wall = room && getWalls(room).find(wall => wall.id === opening.wallId)
  if (!room || !wall) return // Structural validation reports unknown references.
  if (sharedWallSpans(room, wall, project.rooms).some(span => Math.min(span.end, opening.offset + opening.width) - Math.max(span.start, opening.offset) > EPSILON)) throw new DomainError('opening_in_connection', 'wallId', 'opening intersects an open connection')
}

export function wallInward(room: Room, wall: Wall): Point {
  const sign = winding(room)
  return { x: -(wall.end.y - wall.start.y) / wall.length * sign, y: (wall.end.x - wall.start.x) / wall.length * sign }
}
