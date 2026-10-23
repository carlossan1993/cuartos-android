import type { ViewSettings } from '../domain/types'

/** The original schema-1 camera is the automatic-fit sentinel for existing projects. */
export function automaticCamera(view: ViewSettings['camera3d']) {
  return view.position.x === 6 && view.position.y === 6 && view.position.z === 6 && view.target.x === 0 && view.target.y === 0 && view.target.z === 0
}
export function restoredZoom(zoom: number) { return Math.max(.25, Math.min(8, zoom)) }
