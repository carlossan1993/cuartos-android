import type { FurnitureItem } from '../domain/types'
import { convertMeasurementText } from '../projects/room-draft'
import { normalizeRotation } from '../geometry/units'
import { snapPosition } from './geometry'

export function furnitureDraft(item: FurnitureItem) { return { roomId: item.roomId, x: String(item.position.x), y: String(item.position.y), rotation: String(item.rotation), unit: 'm' as 'm' | 'cm' } }
export type FurnitureDraft = ReturnType<typeof furnitureDraft>
export function furnitureFromDraft(draft: FurnitureDraft, item: FurnitureItem, step: number, snap: boolean): FurnitureItem | null {
  const parse = (text: string) => /^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : NaN
  const scale = draft.unit === 'cm' ? 100 : 1
  const x = parse(draft.x) / scale, y = parse(draft.y) / scale, angle = parse(draft.rotation)
  if (![x, y, angle].every(Number.isFinite) || Math.abs(x) > 10000 || Math.abs(y) > 10000 || Math.abs(angle) > 100000) return null
  return { ...item, roomId: draft.roomId, position: snapPosition({ x, y }, step, snap), rotation: normalizeRotation(angle) }
}

export function convertPositionText(text: string, from: 'm' | 'cm', to: 'm' | 'cm'): string {
  return /^-(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text.trim()) ? `-${convertMeasurementText(text.trim().slice(1), from, to)}` : convertMeasurementText(text, from, to)
}
