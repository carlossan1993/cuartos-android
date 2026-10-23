import type { FurnitureItem } from '../domain/types'
import { catalogItem } from './catalog'

export type FurnitureShape = 'box' | 'cylinder' | 'ellipsoid' | 'ring'
export interface FurniturePart {
  shape: FurnitureShape
  center: readonly [number, number, number]
  size: readonly [number, number, number]
  role: string
  color: string
}
export interface Furniture3D {
  id: string
  position: readonly [number, number, number]
  rotationY: number
  parts: readonly FurniturePart[]
}
export const MAX_FURNITURE_VERTICES = 600_000
// Non-indexed vertex counts of the fixed-detail primitives used by the renderer.
const vertexCost: Record<FurnitureShape, number> = { box: 36, cylinder: 240, ellipsoid: 1320, ring: 576 }
const wood = '#a58160', paleWood = '#c9a57e', fabric = '#718571', cushion = '#a6b2bc', white = '#f3f1e9', metal = '#59616b', dark = '#283341'

/** Unit footprint centered in X/Z, elevation 0–1. Front is +Z, as in the 2D symbols. */
function template(id: string): FurniturePart[] {
  const parts: FurniturePart[] = []
  const add = (shape: FurnitureShape, x: number, y: number, z: number, w: number, h: number, d: number, color: string, role = 'body') => parts.push({ shape, center: [x + w / 2 - .5, y + h / 2, z + d / 2 - .5], size: [w, h, d], color, role })
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, role = 'body') => add('box', x, y, z, w, h, d, color, role)
  const legs = (height: number, color = wood) => { for (const x of [.05, .87]) for (const z of [.05, .87]) box(x, 0, z, .08, height, .08, color, 'legs') }
  const doors = (count: number, y: number, h: number) => {
    for (let i = 0; i < count; i++) {
      const x = .03 + i * .94 / count, w = .94 / count - .015
      box(x, y, .97, w, h, .03, paleWood)
      box(x + w - .06, y + h * .4, .995, .018, h * .2, .005, metal, 'hardware')
    }
  }
  if (id.startsWith('bed-')) {
    box(0, .12, 0, 1, .25, 1, wood); legs(.12)
    box(0, .12, 0, 1, .88, .07, wood)
    box(.03, .37, .09, .94, .34, .89, white, 'mattress')
    box(.025, .71, .34, .95, .08, .64, fabric, 'fabric')
    const count = id === 'bed-double' ? 2 : 1
    for (let i = 0; i < count; i++) box(.1 + i * .8 / count, .71, .12, .8 / count - .03, .12, .2, white, 'pillows')
  } else if (id === 'sofa' || id === 'armchair') {
    legs(.12, metal); box(0, .12, 0, 1, .32, 1, '#536574')
    box(0, .44, 0, 1, .56, .18, '#536574')
    for (const x of [0, .88]) box(x, .36, .15, .12, .43, .85, '#536574')
    const count = id === 'sofa' ? 3 : 1
    for (let i = 0; i < count; i++) {
      const x = .14 + .72 * i / count, w = .72 / count - .015
      box(x, .44, .2, w, .14, .76, cushion, 'fabric')
      box(x, .58, .18, w, .32, .12, cushion, 'fabric')
    }
  } else if (id === 'chair') {
    legs(.46); box(0, .46, .04, 1, .12, .96, fabric)
    box(0, .58, 0, 1, .42, .12, fabric)
  } else if (['dining-table', 'desk', 'coffee-table'].includes(id)) {
    legs(.88); box(0, .88, 0, 1, .12, 1, paleWood)
    if (id === 'desk') { box(.65, .6, .05, .3, .28, .9, wood); box(.68, .67, .96, .24, .12, .04, paleWood) }
  } else if (['nightstand', 'wardrobe', 'tv-unit', 'bookshelf'].includes(id)) {
    box(0, 0, 0, 1, .08, 1, wood)
    box(0, .08, 0, 1, .92, .06, wood)
    for (const x of [0, .94]) box(x, .08, 0, .06, .92, 1, wood)
    box(0, .94, 0, 1, .06, 1, wood)
    if (id === 'bookshelf' || id === 'tv-unit') {
      const levels = id === 'bookshelf' ? [.3, .53, .76] : [.5]
      for (const y of levels) box(.06, y, .06, .88, .035, .94, paleWood)
      if (id === 'tv-unit') box(.49, .08, .06, .035, .86, .94, wood)
    } else if (id === 'wardrobe') doors(2, .1, .82)
    else for (const y of [.1, .52]) doors(1, y, .38)
  } else if (id === 'fridge') {
    box(0, 0, 0, 1, 1, .94, '#c7cbd0')
    box(.015, .015, .94, .97, .64, .06, white)
    box(.015, .67, .94, .97, .315, .06, white)
    for (const y of [.48, .73]) box(.08, y, .995, .035, .12, .005, metal, 'hardware')
  } else if (id === 'stove') {
    box(0, 0, 0, 1, .88, 1, '#c7cbd0')
    box(0, .88, 0, 1, .09, 1, dark, 'cooktop')
    for (const x of [.08, .58]) for (const z of [.08, .58]) add('cylinder', x, .97, z, .32, .03, .32, metal, 'burners')
    box(.12, .17, .97, .76, .48, .03, dark, 'oven')
    box(.18, .62, .995, .64, .025, .005, metal, 'hardware')
    for (const x of [.15, .35, .55, .75]) add('cylinder', x, .77, .91, .07, .035, .07, dark, 'hardware')
  } else if (id === 'sink') {
    box(.08, 0, .1, .84, .73, .83, wood)
    box(0, .73, 0, 1, .05, 1, white)
    add('ellipsoid', .1, .69, .15, .8, .14, .8, '#b7c5ca', 'basin')
    add('ring', .02, .78, .12, .96, .08, .86, white, 'basinRim')
    add('cylinder', .46, .78, .02, .08, .22, .08, metal, 'hardware')
    box(.46, .96, .06, .08, .04, .23, metal, 'hardware')
  } else if (id === 'toilet') {
    add('ellipsoid', .27, 0, .33, .46, .47, .55, white)
    add('ellipsoid', .02, .25, .25, .96, .35, .75, white)
    box(.08, .45, 0, .84, .55, .28, white)
    add('ring', 0, .6, .24, 1, .06, .76, white, 'seat')
    add('ellipsoid', .25, .55, .44, .5, .055, .36, '#a6c5cf', 'water')
    box(.42, .98, .1, .16, .02, .08, metal, 'hardware')
  } else {
    box(0, 0, 0, 1, 1, 1, '#a6b2bc')
    box(.1, .45, .99, .8, .1, .01, metal, 'accent')
  }
  return parts
}

/** Descriptors only: no renderer objects or mutation of the stored FurnitureItem. */
export function buildFurniture3D(item: FurnitureItem): Furniture3D {
  const { width, height, depth } = item.dimensions
  const dimensions = [width, height, depth]
  const known = catalogItem(item.catalogId)
  return { id: item.id, position: [item.position.x, 0, item.position.y], rotationY: -item.rotation * Math.PI / 180,
    parts: template(known?.catalogId ?? 'unknown').map(part => ({ ...part,
      center: part.center.map((n, i) => n * dimensions[i]) as [number, number, number],
      size: part.size.map((n, i) => n * dimensions[i]) as [number, number, number],
      color: item.materialOverrides[part.role]?.color ?? part.color,
    })),
  }
}

export function buildFurnitureSet3D(items: readonly FurnitureItem[]): readonly Furniture3D[] {
  let vertices = 0
  return items.map(item => {
    const model = buildFurniture3D(item)
    vertices += model.parts.reduce((sum, part) => sum + vertexCost[part.shape], 0)
    if (vertices > MAX_FURNITURE_VERTICES) throw new Error('3D furniture geometry budget exceeded')
    return model
  })
}
