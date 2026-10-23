import type { Point, SurfaceMaterial } from '../domain/types'
import type { Bounds } from '../editor2d/viewport'
import { patternKind } from './catalog'

/** Schematic joints in metres, independent of camera translation. Dense detail
 * is omitted when it would be subpixel or exceed the bounded drawing budget. */
export function finishPattern(material: SurfaceMaterial, bounds: Bounds, scale: number): readonly (readonly [Point, Point])[] {
  const kind = patternKind(material)
  if (kind !== 'tiles' && kind !== 'planks' || !Number.isFinite(scale) || scale <= 0) return []
  const row = kind === 'tiles' ? .6 : .18, column = kind === 'tiles' ? .6 : 1.2
  if (row * scale < 8) return []
  const firstRow = Math.floor(bounds.top / row), lastRow = Math.ceil(bounds.bottom / row)
  const firstCol = Math.floor(bounds.left / column), lastCol = Math.ceil(bounds.right / column)
  const count = kind === 'tiles' ? lastRow - firstRow + lastCol - firstCol + 2 : (lastRow - firstRow + 1) * (lastCol - firstCol + 3)
  if (count > 400) return []
  const segments: [Point, Point][] = []
  for (let i = firstRow; i <= lastRow; i++) {
    const y = i * row
    if (y >= bounds.top && y <= bounds.bottom) segments.push([{ x: bounds.left, y }, { x: bounds.right, y }])
    if (kind === 'planks' && y < bounds.bottom && y + row > bounds.top) for (let j = firstCol - 1; j <= lastCol; j++) {
      const x = j * column + (Math.abs(i % 2) ? column / 2 : 0)
      if (x >= bounds.left && x <= bounds.right) segments.push([{ x, y: Math.max(bounds.top, y) }, { x, y: Math.min(bounds.bottom, y + row) }])
    }
  }
  if (kind === 'tiles') for (let j = firstCol; j <= lastCol; j++) {
    const x = j * column
    if (x >= bounds.left && x <= bounds.right) segments.push([{ x, y: bounds.top }, { x, y: bounds.bottom }])
  }
  return segments
}
