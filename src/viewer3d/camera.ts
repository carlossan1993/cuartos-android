import type { SceneBounds } from './model'

export function fitDistance(bounds: SceneBounds, aspect: number, fov = 40): number {
  const vertical = fov * Math.PI / 180, horizontal = 2 * Math.atan(Math.tan(vertical / 2) * Math.max(.05, aspect))
  return Math.max(.2, bounds.radius / Math.sin(Math.min(vertical, horizontal) / 2) * 1.04)
}
export function cameraLimits(bounds: SceneBounds) {
  return { near: Math.max(.005, bounds.radius / 1000), far: Math.max(100, bounds.radius * 100), minDistance: Math.max(.1, bounds.radius * .25), maxDistance: Math.max(10, bounds.radius * 20) }
}
