import { DomainError } from '../domain/errors'
import type { Point, Room, Vertex } from '../domain/types'

export const EPSILON = 1e-8
export interface Wall {
  readonly id: string
  readonly start: Point
  readonly end: Point
  readonly length: number
  readonly orientation: 'horizontal' | 'vertical'
}

function near(a: number, b: number): boolean { return Math.abs(a - b) <= EPSILON }
function between(n: number, a: number, b: number): boolean {
  return n >= Math.min(a, b) - EPSILON && n <= Math.max(a, b) + EPSILON
}
function overlap(a: number, b: number, c: number, d: number): boolean {
  return Math.max(Math.min(a, b), Math.min(c, d)) <= Math.min(Math.max(a, b), Math.max(c, d)) + EPSILON
}

function intersects(a: Point, b: Point, c: Point, d: Point): boolean {
  const horizontalAB = near(a.y, b.y)
  const horizontalCD = near(c.y, d.y)
  if (horizontalAB && horizontalCD) return near(a.y, c.y) && overlap(a.x, b.x, c.x, d.x)
  if (!horizontalAB && !horizontalCD) return near(a.x, c.x) && overlap(a.y, b.y, c.y, d.y)
  return horizontalAB
    ? between(c.x, a.x, b.x) && between(a.y, c.y, d.y)
    : between(a.x, c.x, d.x) && between(c.y, a.y, b.y)
}

export function polygonArea(polygon: readonly Point[]): number {
  return Math.abs(polygon.reduce((sum, a, index) => {
    const b = polygon[(index + 1) % polygon.length]
    return sum + a.x * b.y - b.x * a.y
  }, 0)) / 2
}

export function assertOrthogonalPolygon(polygon: readonly Vertex[]): void {
  const fail = (detail: string): never => { throw new DomainError('invalid_polygon', 'polygon', detail) }
  if (polygon.length < 4 || polygon.length > 64) fail('requires 4–64 vertices')
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    if (![a.x, a.y].every(n => Number.isFinite(n) && Math.abs(n) <= 10_000)) fail('invalid coordinate')
    const sameX = near(a.x, b.x)
    const sameY = near(a.y, b.y)
    if (sameX === sameY) fail('edges must be non-zero and orthogonal')
    for (let j = i + 1; j < polygon.length; j++) {
      if (j === i + 1 || (i === 0 && j === polygon.length - 1)) continue
      if (intersects(a, b, polygon[j], polygon[(j + 1) % polygon.length])) fail('self-intersection or touching boundary')
    }
  }
  if (polygonArea(polygon) <= EPSILON) fail('zero area')
}

export function getWalls(room: Room): readonly Wall[] {
  return room.polygon.map((a, index) => {
    const b = room.polygon[(index + 1) % room.polygon.length]
    return {
      // Identifies a directed edge, not its array index. Moving vertices or
      // changing the starting array vertex does not retarget an opening.
      id: `${room.id}:${a.id}:${b.id}`,
      start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y },
      length: Math.hypot(b.x - a.x, b.y - a.y),
      orientation: near(a.y, b.y) ? 'horizontal' : 'vertical',
    }
  })
}

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  if (![point.x, point.y].every(Number.isFinite) || polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i]
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x)
    if (Math.abs(cross) <= EPSILON && between(point.x, a.x, b.x) && between(point.y, a.y, b.y)) return true
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
