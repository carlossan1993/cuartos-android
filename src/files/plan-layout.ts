import type { Project } from '../domain/types'
import { furnitureCorners } from '../furniture/geometry'
import { fitCamera, type Bounds } from '../editor2d/viewport'
import { FileError } from './project-files'

export const PNG_WIDTHS = [1024, 2048] as const
export function planLayout(project: Project, width: number) {
  // Reject before allocating any canvas. At most 3,145,728 output pixels (12 MiB RGBA).
  if (!(PNG_WIDTHS as readonly number[]).includes(width)) throw new FileError('image')
  if (!project.rooms.length) throw new FileError('empty')
  const points = [...project.rooms.flatMap(room => [...room.polygon]), ...project.furniture.flatMap(furnitureCorners)]
  const bounds: Bounds = { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) }
  const size = { width: 1024, height: 768 }
  return { scene: { size, camera: fitCamera(bounds, size) }, bounds, pixelRatio: width / size.width, width, height: width * .75 }
}
