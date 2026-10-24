import { useEffect, useMemo } from 'react'
import type { Furniture3D } from '../furniture/model3d'
import { furnitureGeometry } from './furniture-geometry'

export function FurnitureScene({ model }: { model: Furniture3D }) {
  // Local shape/colors determine buffers; ID and world placement do not.
  const shape = JSON.stringify(model.parts)
  const geometry = useMemo(() => furnitureGeometry({ parts: JSON.parse(shape) as Furniture3D['parts'] }), [shape])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh position={[...model.position]} rotation-y={model.rotationY} geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.82} /></mesh>
}
