import type { FurnitureItem } from '../domain/types'
import { normalizeRotation } from '../geometry/units'

export interface FurnitureRotation { original: FurnitureItem; candidate: FurnitureItem }

// Intermediate turns deliberately bypass placement validation. Only the final
// candidate goes through saveFurnitureChange; the stored Project stays valid.
export function rotateFurniture(draft: FurnitureRotation | null, item: FurnitureItem, direction: -1 | 1): FurnitureRotation {
  const current = draft?.original.id === item.id ? draft : { original: item, candidate: item }
  return { original: current.original, candidate: { ...current.candidate, rotation: normalizeRotation(current.candidate.rotation + direction * 90) } }
}
