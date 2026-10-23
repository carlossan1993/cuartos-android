import type { FurnitureItem, Point } from '../domain/types'
import { snapPosition } from './geometry'

export interface FurnitureDrag { pointerId: number; start: Point; item: FurnitureItem; candidate: FurnitureItem; moved: boolean; scale: number; step: number; snap: boolean }
export function beginFurnitureDrag(pointerId: number, start: Point, item: FurnitureItem, scale: number, step: number, snap: boolean): FurnitureDrag {
  return { pointerId, start, item, candidate: item, moved: false, scale, step, snap }
}
export function moveFurnitureDrag(drag: FurnitureDrag, point: Point): FurnitureDrag {
  const dx = point.x - drag.start.x, dy = point.y - drag.start.y
  const moved = drag.moved || Math.hypot(dx, dy) > 5
  return { ...drag, moved, candidate: moved ? { ...drag.item, position: snapPosition({ x: drag.item.position.x + dx / drag.scale, y: drag.item.position.y + dy / drag.scale }, drag.step, drag.snap) } : drag.item }
}
