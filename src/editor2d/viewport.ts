import type { Point, Room } from '../domain/types'
import { getWalls, pointInPolygon } from '../geometry/rooms'

export interface Size { width: number; height: number }
export interface Camera { x: number; y: number; scale: number }
export interface Bounds { left: number; top: number; right: number; bottom: number }
export interface ScaleLimits { min: number; max: number }
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 8

export function roomBounds(rooms: readonly Room[]): Bounds {
  const points = rooms.flatMap(room => room.polygon)
  if (!points.length) return { left: 0, top: 0, right: 4, bottom: 3 }
  return {
    left: Math.min(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)),
    right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)),
  }
}

export function worldToScreen(point: Point, camera: Camera): Point {
  return { x: point.x * camera.scale + camera.x, y: point.y * camera.scale + camera.y }
}
export function screenToWorld(point: Point, camera: Camera): Point {
  return { x: (point.x - camera.x) / camera.scale, y: (point.y - camera.y) / camera.scale }
}
export function fitCamera(bounds: Bounds, size: Size): Camera {
  const padding = Math.min(64, size.width * 0.18, size.height * 0.18)
  const scale = Math.min((size.width - padding * 2) / Math.max(bounds.right - bounds.left, 0.000001), (size.height - padding * 2) / Math.max(bounds.bottom - bounds.top, 0.000001))
  return { scale, x: size.width / 2 - (bounds.left + bounds.right) / 2 * scale, y: size.height / 2 - (bounds.top + bounds.bottom) / 2 * scale }
}
export function scaleLimits(bounds: Bounds, size: Size): ScaleLimits {
  const fit = fitCamera(bounds, size).scale
  return { min: fit * MIN_ZOOM, max: fit * MAX_ZOOM }
}
export function panCamera(camera: Camera, delta: Point): Camera {
  return { ...camera, x: camera.x + delta.x, y: camera.y + delta.y }
}
export function zoomCamera(camera: Camera, anchor: Point, factor: number, limits: ScaleLimits): Camera {
  const scale = Math.max(limits.min, Math.min(limits.max, camera.scale * factor))
  const world = screenToWorld(anchor, camera)
  return { scale, x: anchor.x - world.x * scale, y: anchor.y - world.y * scale }
}
export function resizeCamera(camera: Camera, oldSize: Size, newSize: Size, bounds: Bounds): Camera {
  const center = screenToWorld({ x: oldSize.width / 2, y: oldSize.height / 2 }, camera)
  const scale = camera.scale * fitCamera(bounds, newSize).scale / fitCamera(bounds, oldSize).scale
  return { scale, x: newSize.width / 2 - center.x * scale, y: newSize.height / 2 - center.y * scale }
}

export function pinchCamera(camera: Camera, before: readonly [Point, Point], after: readonly [Point, Point], limits: ScaleLimits): Camera {
  const midpoint = (points: readonly [Point, Point]): Point => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })
  const distance = (points: readonly [Point, Point]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
  const previousDistance = distance(before), nextDistance = distance(after)
  const factor = previousDistance >= 2 && nextDistance >= 2 ? nextDistance / previousDistance : 1
  const a = midpoint(before), b = midpoint(after)
  return panCamera(zoomCamera(camera, a, factor, limits), { x: b.x - a.x, y: b.y - a.y })
}

/** 1/2/5 intervals keep the grid readable and its line count bounded. */
export function gridStep(scale: number, base = 0.1): number {
  const required = Math.max(1, 22 / scale / base)
  const decade = 10 ** Math.floor(Math.log10(required))
  return [1, 2, 5, 10].find(n => n * decade >= required - 1e-12)! * decade * base
}
export function gridLines(camera: Camera, size: Size, base = 0.1) {
  const step = gridStep(camera.scale, base)
  const start = screenToWorld({ x: 0, y: 0 }, camera), end = screenToWorld({ x: size.width, y: size.height }, camera)
  const positions = (min: number, max: number) => {
    const result: number[] = []
    const first = Math.ceil(min / step), last = Math.floor(max / step)
    for (let i = first; i <= last && result.length < 200; i++) result.push(i * step)
    return result
  }
  return { step, vertical: positions(start.x, end.x).map(x => worldToScreen({ x, y: 0 }, camera).x), horizontal: positions(start.y, end.y).map(y => worldToScreen({ x: 0, y }, camera).y) }
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const squared = dx * dx + dy * dy
  const t = squared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squared)) : 0
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy)
}
export function roomAtPoint(point: Point, camera: Camera, rooms: readonly Room[]): string | null {
  const world = screenToWorld(point, camera)
  for (const room of [...rooms].reverse()) {
    if (pointInPolygon(world, room.polygon) || getWalls(room).some(wall => distanceToSegment(world, wall.start, wall.end) <= 7 / camera.scale)) return room.id
  }
  return null
}
