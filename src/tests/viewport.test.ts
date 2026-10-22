import { describe, expect, it } from 'vitest'
import { createRectangularRoom } from '../domain/project'
import { beginGesture, emptyGesture, endGesture, moveGesture } from '../editor2d/gestures'
import { fitCamera, gridLines, gridStep, panCamera, pinchCamera, resizeCamera, roomAtPoint, roomBounds, scaleLimits, screenToWorld, worldToScreen, zoomCamera } from '../editor2d/viewport'

const room = createRectangularRoom({ id: 'room', name: 'Dormitorio', width: 4.2, depth: 3.15, origin: { x: -2, y: 1 } })
const size = { width: 720, height: 440 }, bounds = roomBounds([room]), camera = fitCamera(bounds, size)
const limits = scaleLimits(bounds, size)
const closePoint = (actual: { x: number; y: number }, expected: { x: number; y: number }) => {
  expect(actual.x).toBeCloseTo(expected.x, 8)
  expect(actual.y).toBeCloseTo(expected.y, 8)
}

describe('shared world/screen transforms', () => {
  it.each([0.25, 1, 8])('round trips negative/fractional coordinates at zoom %s', zoom => {
    const view = { x: -125.5, y: 78.25, scale: camera.scale * zoom }
    for (const point of [{ x: 0, y: 0 }, { x: -2.0125, y: 100.1234 }, { x: 9999, y: -9999 }]) closePoint(screenToWorld(worldToScreen(point, view), view), point)
  })
  it('fits all rooms with room for dimension labels and no change to geometry', () => {
    const second = createRectangularRoom({ id: 'second', name: 'Estudio', width: 2, depth: 2, origin: { x: 5, y: -3 } })
    const before = JSON.stringify([room, second])
    const all = roomBounds([room, second]), fit = fitCamera(all, size)
    for (const point of [room, second].flatMap(r => r.polygon)) {
      const screen = worldToScreen(point, fit)
      expect(screen.x).toBeGreaterThanOrEqual(63.99)
      expect(screen.x).toBeLessThanOrEqual(size.width - 63.99)
      expect(screen.y).toBeGreaterThanOrEqual(63.99)
      expect(screen.y).toBeLessThanOrEqual(size.height - 63.99)
    }
    expect(JSON.stringify([room, second])).toBe(before)
  })
  it.each([0.1, 100])('fits the supported creation sizes: %s m', width => {
    const bounds = roomBounds([createRectangularRoom({ id: 'r', name: 'R', width, depth: width })])
    const fit = fitCamera(bounds, { width: 280, height: 300 })
    expect(Number.isFinite(fit.scale) && fit.scale > 0).toBe(true)
    const middle = worldToScreen({ x: width / 2, y: width / 2 }, fit)
    closePoint(middle, { x: 140, y: 150 })
  })
  it('keeps the world point under the cursor fixed even at both zoom limits', () => {
    const anchor = { x: 177, y: 91 }, world = screenToWorld(anchor, camera)
    const large = zoomCamera(camera, anchor, 1e6, limits)
    const small = zoomCamera(camera, anchor, 1e-6, limits)
    expect(large.scale).toBe(limits.max)
    expect(small.scale).toBe(limits.min)
    closePoint(screenToWorld(anchor, large), world)
    closePoint(screenToWorld(anchor, small), world)
    closePoint(zoomCamera(large, anchor, 2, limits), large)
  })
  it('preserves the center world point and relative zoom across orientation changes', () => {
    const changed = panCamera(zoomCamera(camera, { x: 360, y: 220 }, 2, limits), { x: 37, y: -23 })
    const nextSize = { width: 310, height: 540 }, next = resizeCamera(changed, size, nextSize, bounds)
    closePoint(screenToWorld({ x: 360, y: 220 }, changed), screenToWorld({ x: 155, y: 270 }, next))
    expect(next.scale / fitCamera(bounds, nextSize).scale).toBeCloseTo(2)
  })
  it('calculates pinch scale and translation around the moving midpoint', () => {
    const a = [{ x: 100, y: 100 }, { x: 200, y: 100 }] as const
    const b = [{ x: 70, y: 120 }, { x: 270, y: 120 }] as const
    const next = pinchCamera(camera, a, b, limits)
    expect(next.scale).toBeCloseTo(camera.scale * 2)
    closePoint(screenToWorld({ x: 150, y: 100 }, camera), screenToWorld({ x: 170, y: 120 }, next))
    const coincident = pinchCamera(camera, [{ x: 1, y: 1 }, { x: 1, y: 1 }], [{ x: 2, y: 2 }, { x: 2, y: 2 }], limits)
    expect(coincident.scale).toBe(camera.scale)
    expect(Object.values(coincident).every(Number.isFinite)).toBe(true)
  })
})

describe('grid and selection', () => {
  it.each([0.01, 1, 20, 100, 1000, 10000])('bounds grid cost at scale %s and a large pan', scale => {
    const view = { x: -987654, y: 123456, scale }, grid = gridLines(view, size)
    expect(grid.step).toBeGreaterThanOrEqual(0.1)
    expect(grid.step * scale).toBeGreaterThanOrEqual(22 - 1e-6)
    expect(grid.vertical.length + grid.horizontal.length).toBeLessThan(60)
    expect(grid.vertical.every(x => x >= -1e-6 && x <= size.width + 1e-6)).toBe(true)
    expect(grid.horizontal.every(y => y >= -1e-6 && y <= size.height + 1e-6)).toBe(true)
  })
  it('honors a project grid base larger than the automatic interval', () => {
    expect(gridStep(1000, 0.5)).toBe(0.5)
    expect(gridStep(100, 0.3)).toBe(0.3)
  })
  it.each([0.25, 1, 8])('selects using world geometry with a consistent screen tolerance at zoom %s', zoom => {
    const view = { ...camera, scale: camera.scale * zoom }
    expect(roomAtPoint(worldToScreen({ x: 0, y: 2 }, view), view, [room])).toBe(room.id)
    const edge = worldToScreen({ x: -2, y: 2 }, view)
    expect(roomAtPoint({ x: edge.x - 6, y: edge.y }, view, [room])).toBe(room.id)
    expect(roomAtPoint({ x: edge.x - 10, y: edge.y }, view, [room])).toBeNull()
  })
  it('picks the topmost room and clears when tapping empty space', () => {
    const top = { ...room, id: 'top' }
    expect(roomAtPoint(worldToScreen({ x: 0, y: 2 }, camera), camera, [room, top])).toBe('top')
    expect(roomAtPoint({ x: -1000, y: -1000 }, camera, [room])).toBeNull()
  })
})

describe('pointer gesture transitions', () => {
  it('treats small finger jitter as a tap without moving the view', () => {
    const start = beginGesture(emptyGesture, 1, { x: 100, y: 100 })
    const move = moveGesture(start, 1, { x: 103, y: 102 }, camera, limits)
    expect(move.camera).toBe(camera)
    expect(endGesture(move.gesture, 1).tap).toEqual({ x: 103, y: 102 })
  })
  it('pans after the threshold and never selects on release', () => {
    let state = beginGesture(emptyGesture, 1, { x: 100, y: 100 })
    state = moveGesture(state, 1, { x: 102, y: 100 }, camera, limits).gesture
    const moved = moveGesture(state, 1, { x: 130, y: 110 }, camera, limits)
    expect(moved.camera.x).toBeCloseTo(camera.x + 30)
    expect(moved.camera.y).toBeCloseTo(camera.y + 10)
    expect(endGesture(moved.gesture, 1).tap).toBeNull()
  })
  it('continues one-finger pan after a pinch without a jump or accidental selection', () => {
    let state = beginGesture(beginGesture(emptyGesture, 1, { x: 100, y: 100 }), 2, { x: 200, y: 100 })
    const pinch = moveGesture(state, 2, { x: 250, y: 100 }, camera, limits)
    expect(pinch.camera.scale).toBeCloseTo(camera.scale * 1.5)
    state = endGesture(pinch.gesture, 2).gesture
    const single = moveGesture(state, 1, { x: 110, y: 105 }, pinch.camera, limits)
    expect(single.camera.x).toBeCloseTo(pinch.camera.x + 10)
    expect(single.camera.y).toBeCloseTo(pinch.camera.y + 5)
    expect(endGesture(single.gesture, 1).tap).toBeNull()
  })
  it('ignores untracked/third pointers and cancellations never become clicks', () => {
    const start = beginGesture(emptyGesture, 1, { x: 20, y: 30 })
    expect(moveGesture(start, 99, { x: 200, y: 100 }, camera, limits).camera).toBe(camera)
    expect(endGesture(start, 1, true)).toEqual({ gesture: emptyGesture, tap: null })
    const two = beginGesture(start, 2, { x: 120, y: 30 })
    expect(beginGesture(two, 3, { x: 10, y: 20 })).toBe(two)
    expect(endGesture(two, 99).gesture).toBe(two)
    expect(endGesture(endGesture(two, 1, true).gesture, 2).tap).toBeNull()
  })
})
