import type { Point } from '../domain/types'
import { panCamera, pinchCamera, type Camera, type ScaleLimits } from './viewport'

export interface Gesture {
  readonly pointers: Readonly<Record<number, Point>>
  readonly origin: Point | null
  readonly moved: boolean
}
export const emptyGesture: Gesture = { pointers: {}, origin: null, moved: false }

export function beginGesture(state: Gesture, id: number, point: Point): Gesture {
  if (Object.keys(state.pointers).length >= 2) return state
  const alreadyActive = Object.keys(state.pointers).length > 0
  return { pointers: { ...state.pointers, [id]: point }, origin: alreadyActive ? state.origin : point, moved: alreadyActive || state.moved }
}

export function moveGesture(state: Gesture, id: number, point: Point, camera: Camera, limits: ScaleLimits): { gesture: Gesture; camera: Camera } {
  if (!state.pointers[id]) return { gesture: state, camera }
  const pointers = { ...state.pointers, [id]: point }
  const before = Object.values(state.pointers), after = Object.values(pointers)
  if (before.length === 2) return {
    gesture: { ...state, pointers, moved: true },
    camera: pinchCamera(camera, before as [Point, Point], after as [Point, Point], limits),
  }
  const moved = state.moved || !!state.origin && Math.hypot(point.x - state.origin.x, point.y - state.origin.y) > 5
  const anchor = state.moved ? state.pointers[id] : state.origin!
  return {
    gesture: { ...state, pointers, moved },
    camera: moved ? panCamera(camera, { x: point.x - anchor.x, y: point.y - anchor.y }) : camera,
  }
}

export function endGesture(state: Gesture, id: number, cancelled = false): { gesture: Gesture; tap: Point | null } {
  if (!state.pointers[id]) return { gesture: state, tap: null }
  const tap = !cancelled && !state.moved && Object.keys(state.pointers).length === 1 ? state.pointers[id] : null
  const pointers = { ...state.pointers }
  delete pointers[id]
  return { tap, gesture: Object.keys(pointers).length ? { pointers, origin: Object.values(pointers)[0], moved: true } : emptyGesture }
}
