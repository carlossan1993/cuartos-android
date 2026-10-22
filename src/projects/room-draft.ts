import { createProject, createRectangularRoom } from '../domain/project'
import type { Project } from '../domain/types'
import { toMeters, type LengthUnit } from '../geometry/units'

export interface RoomDraft {
  projectName: string
  roomName: string
  width: string
  depth: string
  height: string
  unit: LengthUnit
}
export type DraftField = Exclude<keyof RoomDraft, 'unit'>
export type DraftErrors = Partial<Record<DraftField, 'nameRequired' | 'nameTooLong' | 'measurement'>>
export const MIN_ROOM_SIZE = 0.1
export const MAX_ROOM_SIZE = 100
export const initialRoomDraft: RoomDraft = { projectName: '', roomName: '', width: '4', depth: '3', height: '2.6', unit: 'm' }

const decimal = /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/

export function readMeasurement(value: string, unit: LengthUnit): number | null {
  const text = value.trim()
  if (!decimal.test(text)) return null
  const numeric = Number(text.replace(',', '.'))
  if (!Number.isFinite(numeric)) return null
  const metres = toMeters(numeric, unit)
  return Number.isFinite(metres) && metres >= MIN_ROOM_SIZE && metres <= MAX_ROOM_SIZE ? metres : null
}

/** Move the decimal point as text, so toggling units never rounds an entry. */
export function convertMeasurementText(value: string, from: LengthUnit, to: LengthUnit): string {
  if (from === to || !decimal.test(value.trim())) return value
  const [integer = '', fraction = ''] = value.trim().replace(',', '.').split('.')
  const digits = `00${integer}${fraction}00`
  const point = 2 + integer.length + (to === 'cm' ? 2 : -2)
  const left = digits.slice(0, point).replace(/^0+(?=\d)/, '') || '0'
  const right = digits.slice(point).replace(/0+$/, '')
  return right ? `${left}.${right}` : left
}

export function validateRoomDraft(draft: RoomDraft): DraftErrors {
  const errors: DraftErrors = {}
  for (const field of ['projectName', 'roomName'] as const) {
    if (!draft[field].trim()) errors[field] = 'nameRequired'
    else if (draft[field].trim().length > 120) errors[field] = 'nameTooLong'
  }
  for (const field of ['width', 'depth', 'height'] as const) {
    if (readMeasurement(draft[field], draft.unit) === null) errors[field] = 'measurement'
  }
  return errors
}

export function projectFromRoomDraft(draft: RoomDraft, language: 'es' | 'en', dependencies: { id: () => string; now: () => Date }): Project {
  if (Object.keys(validateRoomDraft(draft)).length) throw new Error('Invalid room draft')
  const room = createRectangularRoom({
    id: dependencies.id(), name: draft.roomName,
    width: readMeasurement(draft.width, draft.unit)!, depth: readMeasurement(draft.depth, draft.unit)!,
    height: readMeasurement(draft.height, draft.unit)!,
  })
  return {
    ...createProject({ id: dependencies.id(), name: draft.projectName, language, now: dependencies.now().toISOString() }),
    rooms: [room],
  }
}
