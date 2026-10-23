import type { Opening, Point, Project, Room, SurfaceMaterial } from '../domain/types'
import { EPSILON, getWalls } from '../geometry/rooms'
import { furnitureCorners } from '../furniture/geometry'
import { sharedWallSpans } from '../geometry/layout'

export interface Solid3D { center: readonly [number, number, number]; size: readonly [number, number, number]; rotationY: number }
export interface Wall3D {
  id: string; material: SurfaceMaterial; midpoint: Point; outward: Point
  solids: readonly Solid3D[]; openings: readonly Opening3D[]
}
export interface Opening3D { id: string; type: Opening['type']; solid: Solid3D }
export interface Corner3D { walls: readonly [string, string]; material: SurfaceMaterial; solid: Solid3D }
export interface Room3D { room: Room; walls: readonly Wall3D[]; corners: readonly Corner3D[] }
export interface SceneBounds { center: readonly [number, number, number]; size: readonly [number, number, number]; radius: number }
export const MAX_WALL_SOLIDS = 4096
export const FLOOR_DEPTH = .08
const unique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b)

export function buildRoom3D(room: Room, openings: readonly Opening[], rooms: readonly Room[] = [room]): Room3D {
  const walls = getWalls(room), signed = room.polygon.reduce((sum, a, i) => { const b = room.polygon[(i + 1) % room.polygon.length]; return sum + a.x * b.y - b.x * a.y }, 0)
  const sign = signed > 0 ? 1 : -1
  let count = 0
  const result: Wall3D[] = walls.map(wall => {
    const u = { x: (wall.end.x - wall.start.x) / wall.length, y: (wall.end.y - wall.start.y) / wall.length }
    const outward = { x: u.y * sign, y: -u.x * sign }, rotationY = -Math.atan2(u.y, u.x)
    const apertures = openings.filter(o => o.roomId === room.id && o.wallId === wall.id)
    const passages = sharedWallSpans(room, wall, rooms).map(span => ({ offset: span.start, width: span.end - span.start, sillHeight: 0, height: room.height }))
    const voids = [...apertures, ...passages]
    // Geometry cuts are clamped only within the domain's numeric tolerance.
    const cuts = unique([0, wall.length, ...voids.flatMap(o => [Math.max(0, Math.min(wall.length, o.offset)), Math.max(0, Math.min(wall.length, o.offset + o.width))])])
    const solids: Solid3D[] = []
    const solid = (start: number, end: number, bottom: number, top: number): Solid3D => ({ center: [wall.start.x + u.x * (start + end) / 2 + outward.x * room.wallThickness / 2, (bottom + top) / 2, wall.start.y + u.y * (start + end) / 2 + outward.y * room.wallThickness / 2], size: [end - start, top - bottom, room.wallThickness], rotationY })
    const add = (a: number, b: number, bottom: number, top: number) => {
      if (top - bottom <= EPSILON || b - a <= EPSILON) return
      if (++count > MAX_WALL_SOLIDS) throw new Error('3D wall geometry budget exceeded')
      solids.push(solid(a, b, bottom, top))
    }
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1], middle = (a + b) / 2
      const occupied = voids.filter(o => middle > o.offset && middle < o.offset + o.width).map(o => [Math.max(0, o.sillHeight), Math.min(room.height, o.sillHeight + o.height)]).sort((a, b) => a[0] - b[0])
      let bottom = 0
      for (const [low, high] of occupied) { add(a, b, bottom, low); bottom = Math.max(bottom, high) }
      add(a, b, bottom, room.height)
    }
    const mappedOpenings = apertures.map((opening): Opening3D => {
      if (opening.type === 'window') return { id: opening.id, type: opening.type, solid: { ...solid(opening.offset, opening.offset + opening.width, opening.sillHeight, opening.sillHeight + opening.height), size: [opening.width, opening.height, .012] } }
      // Same conventional hinge/opening direction as the 2D door symbol.
      const inward = { x: -outward.x, y: -outward.y }
      return { id: opening.id, type: opening.type, solid: { center: [wall.start.x + u.x * opening.offset + inward.x * opening.width / 2, opening.height / 2, wall.start.y + u.y * opening.offset + inward.y * opening.width / 2], size: [opening.width, opening.height, .035], rotationY: -Math.atan2(inward.y, inward.x) } }
    })
    return { id: wall.id, material: room.wallMaterials[wall.id], midpoint: { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }, outward, solids, openings: mappedOpenings }
  })
  const corners: Corner3D[] = []
  result.forEach((wall, i) => {
    const previous = result[(i + result.length - 1) % result.length], vertex = walls[i].start
    const a = walls[(i + walls.length - 1) % walls.length], b = walls[i]
    const cross = (a.end.x - a.start.x) * (b.end.y - b.start.y) - (a.end.y - a.start.y) * (b.end.x - b.start.x)
    if (cross * sign <= 0) return
    if (sharedWallSpans(room, b, rooms).some(span => span.start <= EPSILON) || sharedWallSpans(room, a, rooms).some(span => span.end >= a.length - EPSILON)) return
    corners.push({ walls: [previous.id, wall.id], material: wall.material, solid: { center: [vertex.x + (previous.outward.x + wall.outward.x) * room.wallThickness / 2, room.height / 2, vertex.y + (previous.outward.y + wall.outward.y) * room.wallThickness / 2], size: [room.wallThickness, room.height, room.wallThickness], rotationY: 0 } })
  })
  return { room, walls: result, corners }
}
export function sceneBounds(project: Project): SceneBounds {
  if (!project.rooms.length) return { center: [0, 1.3, 0], size: [4, 2.68, 3], radius: 3 }
  const points = [...project.rooms.flatMap(room => room.polygon.map(p => ({ x: p.x, z: p.y, t: room.wallThickness }))), ...project.furniture.flatMap(item => furnitureCorners(item).map(p => ({ x: p.x, z: p.y, t: 0 })))]
  const minX = Math.min(...points.map(p => p.x - p.t)), maxX = Math.max(...points.map(p => p.x + p.t))
  const minZ = Math.min(...points.map(p => p.z - p.t)), maxZ = Math.max(...points.map(p => p.z + p.t))
  const height = Math.max(...project.rooms.map(room => room.height), ...project.furniture.map(item => item.dimensions.height))
  const size: [number, number, number] = [maxX - minX, height + FLOOR_DEPTH, maxZ - minZ]
  return { center: [(minX + maxX) / 2, (height - FLOOR_DEPTH) / 2, (minZ + maxZ) / 2], size, radius: Math.hypot(...size) / 2 }
}
export function wallFacesCamera(wall: Pick<Wall3D, 'outward' | 'midpoint'>, x: number, z: number): boolean {
  return wall.outward.x * (x - wall.midpoint.x) + wall.outward.y * (z - wall.midpoint.y) > EPSILON
}
