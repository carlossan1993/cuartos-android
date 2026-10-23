import { DomainError } from '../domain/errors'
import type { Opening, Project } from '../domain/types'
import { assertProject } from '../domain/validation'
import { assertOpeningOutsideConnection, visibleWallSpans } from '../geometry/layout'
import { getWalls } from '../geometry/rooms'
import { fromMeters, type LengthUnit } from '../geometry/units'

export interface OpeningDraft {
  roomId: string; wallId: string; type: Opening['type']; unit: LengthUnit
  offset: string; width: string; height: string; sillHeight: string
}
export type OpeningField = 'roomId' | 'wallId' | 'offset' | 'width' | 'height' | 'sillHeight'
export type OpeningErrors = Partial<Record<OpeningField, 'choose' | 'positive' | 'nonNegative' | 'wallFit' | 'heightFit'>>

export function initialOpeningDraft(project: Project, roomId: string, type: Opening['type'], opening?: Opening): OpeningDraft {
  if (opening) return { ...opening, offset: String(opening.offset), width: String(opening.width), height: String(opening.height), sillHeight: String(opening.sillHeight), unit: 'm' }
  const room = project.rooms.find(room => room.id === roomId) ?? project.rooms[0]
  const wall = room && getWalls(room).find(wall => visibleWallSpans(room, wall, project.rooms).length)
  const span = room && wall ? visibleWallSpans(room, wall, project.rooms)[0] : undefined, start = span?.start ?? 0, length = span ? span.end - span.start : wall?.length ?? 4
  return { roomId: room?.id ?? '', wallId: wall?.id ?? '', type, unit: 'm', offset: String(start + Math.min(0.5, length * 0.1)), width: String(Math.min(type === 'door' ? 0.9 : 1.2, length * 0.4)), height: String(Math.min(type === 'door' ? 2.1 : 1.2, (room?.height ?? 2.6) * (type === 'door' ? 1 : 0.5))), sillHeight: type === 'door' ? '0' : String(Math.min(1, (room?.height ?? 2.6) * 0.25)) }
}

function measure(text: string, unit: LengthUnit): number | null {
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text.trim())) return null
  const value = Number(text.trim().replace(',', '.')) / (unit === 'cm' ? 100 : 1)
  return Number.isFinite(value) && value >= 0 && value <= 10000 ? value : null
}

export function validateOpeningDraft(draft: OpeningDraft, project: Project, id: string, editing = false): { errors: OpeningErrors; opening?: Opening; issue?: 'overlap' | 'limit' | 'notFound' | 'invalid' | 'connection' } {
  const errors: OpeningErrors = {}, room = project.rooms.find(room => room.id === draft.roomId)
  if (!room) errors.roomId = 'choose'
  if (!room || !getWalls(room).some(wall => wall.id === draft.wallId)) errors.wallId = 'choose'
  const offset = measure(draft.offset, draft.unit), width = measure(draft.width, draft.unit), height = measure(draft.height, draft.unit)
  const sillHeight = draft.type === 'door' ? 0 : measure(draft.sillHeight, draft.unit)
  for (const [field, value] of Object.entries({ offset, width, height, sillHeight })) {
    const positive = field === 'width' || field === 'height'
    if (value === null || positive && value < 0.000001) errors[field as OpeningField] = positive ? 'positive' : 'nonNegative'
  }
  if (Object.keys(errors).length) return { errors }
  if (editing && !project.openings.some(o => o.id === id)) return { errors, issue: 'notFound' }
  if (!editing && project.openings.length >= 256) return { errors, issue: 'limit' }
  const opening: Opening = { id, roomId: draft.roomId, wallId: draft.wallId, type: draft.type, offset: offset!, width: width!, height: height!, sillHeight: sillHeight! }
  try {
    assertOpeningOutsideConnection(opening, project)
    assertProject({ ...project, openings: editing ? project.openings.map(o => o.id === id ? opening : o) : [...project.openings, opening] })
    return { errors, opening }
  } catch (error) {
    if (error instanceof DomainError) {
      if (error.code === 'opening_in_connection') return { errors, issue: 'connection' }
      if (error.code === 'opening_outside_wall') return { errors: { width: 'wallFit' } }
      if (error.code === 'opening_outside_height') return { errors: { height: 'heightFit' } }
      if (error.code === 'opening_overlap') return { errors, issue: 'overlap' }
    }
    return { errors, issue: 'invalid' }
  }
}

export function openingDimensionsLabel(opening: Opening, format: (value: number) => string, unit: LengthUnit = 'm') {
  return `${format(fromMeters(opening.width, unit))} × ${format(fromMeters(opening.height, unit))} ${unit}`
}
