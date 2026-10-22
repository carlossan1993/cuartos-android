import { DomainError } from '../domain/errors'
import type { Point, WorldPoint } from '../domain/types'

export type LengthUnit = 'm' | 'cm'

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new DomainError('invalid_value', 'measurement', 'must be finite')
  return value
}

export function toMeters(value: number, unit: LengthUnit): number {
  finite(value)
  if (unit !== 'm' && unit !== 'cm') throw new DomainError('invalid_value', 'unit', 'unsupported unit')
  return finite(unit === 'cm' ? value / 100 : value)
}

export function fromMeters(value: number, unit: LengthUnit): number {
  finite(value)
  if (unit !== 'm' && unit !== 'cm') throw new DomainError('invalid_value', 'unit', 'unsupported unit')
  return finite(unit === 'cm' ? value * 100 : value)
}

export function normalizeRotation(degrees: number): number {
  finite(degrees)
  return ((degrees % 360) + 360) % 360
}

/** Plan Y maps to world Z; elevation is world Y, all in metres. */
export function planToWorld(point: Point, elevation = 0): WorldPoint {
  return { x: finite(point.x), y: finite(elevation), z: finite(point.y) }
}

export function worldToPlan(point: WorldPoint): Point {
  finite(point.y)
  return { x: finite(point.x), y: finite(point.z) }
}
