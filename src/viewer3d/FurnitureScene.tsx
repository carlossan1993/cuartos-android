import { useEffect, useMemo } from 'react'
import type { Furniture3D } from '../furniture/model3d'
import { furnitureGeometry } from './furniture-geometry'

export function FurnitureScene({ model }: { model: Furniture3D }) {
  const geometry = useMemo(() => furnitureGeometry(model), [model])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh position={[...model.position]} rotation-y={model.rotationY} geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.82} /></mesh>
}
