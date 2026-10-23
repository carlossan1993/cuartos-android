import { createProject, createRectangularRoom } from '../domain/project'
import type { Project, Room } from '../domain/types'
import { toMeters, type LengthUnit } from '../geometry/units'
import { createLRoom, type LayoutShape } from './layout-rooms'

export interface RoomDraft {
  shape: LayoutShape
  orientation: 'right' | 'below'
  room2Name: string
  width2: string
  depth2: string
  cutWidth: string
  cutDepth: string
  projectName: string
  roomName: string
  width: string
  depth: string
  height: string
  unit: LengthUnit
}
export type DraftField = Exclude<keyof RoomDraft, 'unit' | 'shape' | 'orientation'>
export type DraftErrors = Partial<Record<DraftField, 'nameRequired' | 'nameTooLong' | 'measurement' | 'cutout'>>
export const MIN_ROOM_SIZE = 0.1
export const MAX_ROOM_SIZE = 100
export const initialRoomDraft: RoomDraft = { shape: 'rectangle', orientation: 'right', room2Name: '', width2: '3', depth2: '3', cutWidth: '1.5', cutDepth: '1.5', projectName: '', roomName: '', width: '4', depth: '3', height: '2.6', unit: 'm' }

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
  for (const field of nameFields(draft)) {
    if (!draft[field].trim()) errors[field] = 'nameRequired'
    else if (draft[field].trim().length > 120) errors[field] = 'nameTooLong'
  }
  for (const field of measurementFields(draft)) {
    if (readMeasurement(draft[field], draft.unit) === null) errors[field] = 'measurement'
  }
  if (draft.shape === 'l' && !errors.width && !errors.depth && !errors.cutWidth && !errors.cutDepth) {
    if (readMeasurement(draft.width, draft.unit)! - readMeasurement(draft.cutWidth, draft.unit)! < MIN_ROOM_SIZE - 1e-8) errors.cutWidth = 'cutout'
    if (readMeasurement(draft.depth, draft.unit)! - readMeasurement(draft.cutDepth, draft.unit)! < MIN_ROOM_SIZE - 1e-8) errors.cutDepth = 'cutout'
  }
  return errors
}

export function nameFields(draft: RoomDraft): DraftField[] { return draft.shape === 'connected' ? ['projectName', 'roomName', 'room2Name'] : ['projectName', 'roomName'] }
export function measurementFields(draft: RoomDraft): DraftField[] { return ['width', 'depth', 'height', ...(draft.shape === 'l' ? ['cutWidth', 'cutDepth'] as const : draft.shape === 'connected' ? ['width2', 'depth2'] as const : [])] }

export function roomsFromRoomDraft(draft: RoomDraft, id: () => string): readonly Room[] {
  const width = readMeasurement(draft.width, draft.unit)!, depth = readMeasurement(draft.depth, draft.unit)!, height = readMeasurement(draft.height, draft.unit)!
  const first = { id: id(), name: draft.roomName, width, depth, height }
  if (draft.shape === 'l') return [createLRoom({ ...first, cutWidth: readMeasurement(draft.cutWidth, draft.unit)!, cutDepth: readMeasurement(draft.cutDepth, draft.unit)! })]
  const room = createRectangularRoom(first)
  return draft.shape === 'connected' ? [room, createRectangularRoom({ id: id(), name: draft.room2Name, width: readMeasurement(draft.width2, draft.unit)!, depth: readMeasurement(draft.depth2, draft.unit)!, height, origin: draft.orientation === 'right' ? { x: width, y: 0 } : { x: 0, y: depth } })] : [room]
}

export function projectFromRoomDraft(draft: RoomDraft, language: 'es' | 'en', dependencies: { id: () => string; now: () => Date }): Project {
  if (Object.keys(validateRoomDraft(draft)).length) throw new Error('Invalid room draft')
  const rooms = roomsFromRoomDraft(draft, dependencies.id)
  return {
    ...createProject({ id: dependencies.id(), name: draft.projectName, language, now: dependencies.now().toISOString() }),
    rooms,
  }
}
