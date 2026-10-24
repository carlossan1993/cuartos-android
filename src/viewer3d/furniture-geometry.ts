import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Furniture3D, FurnitureShape } from '../furniture/model3d'

function primitive(shape: FurnitureShape): BufferGeometry {
  if (shape === 'cylinder') return new CylinderGeometry(.5, .5, 1, 20)
  if (shape === 'ellipsoid') return new SphereGeometry(.5, 20, 12)
  if (shape === 'ring') {
    const outline = new Shape(), hole = new Path()
    outline.absellipse(0, 0, .5, .5, 0, Math.PI * 2, false, 0)
    hole.absellipse(0, 0, .34, .34, 0, Math.PI * 2, true, 0)
    outline.holes.push(hole)
    const geometry = new ExtrudeGeometry(outline, { depth: 1, steps: 1, bevelEnabled: false, curveSegments: 12 })
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, -.5, 0)
    return geometry
  }
  return new BoxGeometry(1, 1, 1)
}

/** One mesh/material per item, with local linear-space vertex colors for each part. */
export function furnitureGeometry(model: Pick<Furniture3D, 'parts'>): BufferGeometry {
  const pieces: BufferGeometry[] = []
  try {
    for (const part of model.parts) {
      const source = primitive(part.shape), geometry = source.index ? source.toNonIndexed() : source
      if (geometry !== source) source.dispose()
      pieces.push(geometry)
      geometry.clearGroups(); geometry.scale(...part.size); geometry.translate(...part.center)
      const color = new Color(part.color), colors = new Float32Array(geometry.getAttribute('position').count * 3)
      for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b }
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    }
    const geometry = mergeGeometries(pieces, false) ?? new BufferGeometry()
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    return geometry
  } finally { pieces.forEach(piece => piece.dispose()) }
}
