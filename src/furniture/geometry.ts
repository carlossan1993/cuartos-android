import { DomainError } from '../domain/errors'
import type { FurnitureItem, Point, Room } from '../domain/types'
import { EPSILON, pointInPolygon } from '../geometry/rooms'

export function furnitureCorners(item: FurnitureItem): readonly Point[] {
  const angle = item.rotation * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle)
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({ x: item.position.x + x * item.dimensions.width / 2 * c - y * item.dimensions.depth / 2 * s, y: item.position.y + x * item.dimensions.width / 2 * s + y * item.dimensions.depth / 2 * c }))
}
function segmentInside(a: Point, b: Point, polygon: readonly Point[]): boolean {
  // Split at every polygon edge crossing. Testing each resulting interval
  // handles concave rooms; checking corners alone would allow bridging a notch.
  const cuts = [0, 1], dx = b.x - a.x, dy = b.y - a.y
  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i], d = polygon[(i + 1) % polygon.length], ex = d.x - c.x, ey = d.y - c.y
    const determinant = dx * ey - dy * ex
    if (Math.abs(determinant) <= EPSILON) continue
    const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / determinant
    const u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / determinant
    if (t > 0 && t < 1 && u >= -EPSILON && u <= 1 + EPSILON) cuts.push(t)
  }
  cuts.sort((x, y) => x - y)
  return cuts.slice(1).every((t, i) => { const m = (cuts[i] + t) / 2; return pointInPolygon({ x: a.x + dx * m, y: a.y + dy * m }, polygon) })
}
export function furnitureFits(item: FurnitureItem, room: Room): boolean {
  if (item.roomId !== room.id || ![item.position.x, item.position.y, item.rotation, item.dimensions.width, item.dimensions.depth, item.dimensions.height].every(Number.isFinite) || item.dimensions.width <= 0 || item.dimensions.depth <= 0 || item.dimensions.height <= 0 || item.dimensions.height > room.height + EPSILON) return false
  const corners = furnitureCorners(item)
  return pointInPolygon(item.position, room.polygon) && corners.every((point, i) => pointInPolygon(point, room.polygon) && segmentInside(point, corners[(i + 1) % 4], room.polygon))
}
export function assertFurniturePlacement(item: FurnitureItem, room: Room) {
  if (item.dimensions.height > room.height + EPSILON) throw new DomainError('furniture_height', 'dimensions.height', 'furniture exceeds room height')
  if (!furnitureFits(item, room)) throw new DomainError('furniture_outside_room', 'position', 'furniture footprint must fit inside room')
}
export function snapPosition(point: Point, step: number, enabled: boolean): Point {
  if (!enabled) return { ...point }
  if (!Number.isFinite(step) || step <= 0) throw new DomainError('invalid_value', 'gridSize', 'invalid snap interval')
  const snap = (n: number) => Number((Math.round(n / step) * step).toFixed(9))
  return { x: snap(point.x), y: snap(point.y) }
}
export function furnitureAtPoint(point: Point, items: readonly FurnitureItem[], tolerance = 0): string | null {
  for (const item of [...items].reverse()) {
    const angle = -item.rotation * Math.PI / 180, dx = point.x - item.position.x, dy = point.y - item.position.y
    const x = dx * Math.cos(angle) - dy * Math.sin(angle), y = dx * Math.sin(angle) + dy * Math.cos(angle)
    if (Math.abs(x) <= item.dimensions.width / 2 + tolerance && Math.abs(y) <= item.dimensions.depth / 2 + tolerance) return item.id
  }
  return null
}
export function initialPlacement(item: FurnitureItem, room: Room, step: number, snap: boolean, duplicate = false): FurnitureItem {
  const xs = room.polygon.map(p => p.x), ys = room.polygon.map(p => p.y)
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys)
  const candidates: Point[] = duplicate ? [{ x: item.position.x + .2, y: item.position.y + .2 }, { x: item.position.x - .2, y: item.position.y - .2 }, item.position] : [{ x: (left + right) / 2, y: (top + bottom) / 2 }]
  for (const point of candidates) { const next = { ...item, position: snapPosition(point, step, snap) }; if (furnitureFits(next, room)) return next }
  // Bounded search is a convenience, not a packing solver. A piece that cannot
  // be placed automatically can be positioned with explicit coordinates.
  for (let y = 0; y <= 24; y++) for (let x = 0; x <= 24; x++) {
    const next = { ...item, position: snapPosition({ x: left + (right - left) * x / 24, y: top + (bottom - top) * y / 24 }, step, snap) }
    if (furnitureFits(next, room)) return next
  }
  throw new DomainError('furniture_outside_room', 'position', 'no automatic placement fits')
}
