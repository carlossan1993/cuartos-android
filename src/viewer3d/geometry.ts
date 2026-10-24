import { BoxGeometry, BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Room } from '../domain/types'
import { FLOOR_DEPTH, type Solid3D } from './model'

export function floorGeometry(room: Pick<Room, 'polygon'>) {
  const shape = new Shape()
  room.polygon.forEach((p, i) => { if (i === 0) shape.moveTo(p.x, -p.y); else shape.lineTo(p.x, -p.y) })
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, { depth: FLOOR_DEPTH, steps: 1, bevelEnabled: false, curveSegments: 1 })
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, -FLOOR_DEPTH, 0)
  return geometry
}
export function solidGeometry(solids: readonly Solid3D[]): BufferGeometry {
  const pieces = solids.map(solid => {
    const geometry = new BoxGeometry(...solid.size)
    geometry.rotateY(solid.rotationY); geometry.translate(...solid.center)
    return geometry
  })
  try { return pieces.length ? mergeGeometries(pieces, false)! : new BufferGeometry() }
  finally { pieces.forEach(piece => piece.dispose()) }
}
