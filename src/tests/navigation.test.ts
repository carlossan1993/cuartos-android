import { describe, expect, it, vi } from 'vitest'
import { attachAndroidBack, createBackController, type AndroidBackPlugin } from '../navigation/back-controller'

describe('ordered Android navigation', () => {
  it('closes the most recent highest-priority layer before the page and exits only at the root', () => {
    const back = createBackController(), visited: string[] = []
    let atRoot = false
    back.add(() => { if (atRoot) return false; visited.push('page'); atRoot = true; return true }, 0)
    const closeFirst = back.add(() => { visited.push('panel'); closeFirst(); return true }, 20)
    const closeLast = back.add(() => { visited.push('gesture'); closeLast(); return true }, 20)
    expect(back.request()).toBe(true); expect(visited).toEqual(['gesture'])
    expect(back.request()).toBe(true); expect(visited).toEqual(['gesture', 'panel'])
    expect(back.request()).toBe(true); expect(visited).toEqual(['gesture', 'panel', 'page'])
    expect(back.request()).toBe(false)
  })
  it('consumes back during a commit and honors a local pending operation without navigation', () => {
    let pending = true, savingFile = true
    const back = createBackController(() => pending), page = vi.fn(() => true), panel = vi.fn(() => savingFile)
    back.add(page, 0); back.add(panel, 20)
    expect(back.request()).toBe(true); expect(panel).not.toHaveBeenCalled(); expect(page).not.toHaveBeenCalled()
    pending = false; expect(back.request()).toBe(true); expect(page).not.toHaveBeenCalled()
    savingFile = false; expect(back.request()).toBe(true); expect(page).toHaveBeenCalledTimes(1)
  })
  it('supports replacement/removal, ignores removed layers and blocks reentrant back', () => {
    const back = createBackController(), stale = vi.fn(() => true), remove = back.add(stale, 0)
    back.add(() => { remove(); expect(back.request()).toBe(true); return false }, 10)
    expect(back.request()).toBe(false); expect(stale).not.toHaveBeenCalled()
  })
  it('releases dispatch protection when a handler throws', () => {
    const back = createBackController(), remove = back.add(() => { throw Error('handler') }, 0)
    expect(() => back.request()).toThrow('handler'); remove(); expect(back.request()).toBe(false)
  })
})
function plugin() {
  let callback!: () => void
  const remove = vi.fn(async () => {}), exitApp = vi.fn(async () => {})
  const app: AndroidBackPlugin = { addListener: async (_event, handler) => { callback = handler; return { remove } }, exitApp }
  return { app, fire: () => callback(), remove, exitApp }
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
describe('native App listener lifecycle', () => {
  it('routes consumed events locally and calls native exit only after navigation is exhausted', async () => {
    const { app, fire, exitApp, remove } = plugin(), request = vi.fn(() => true), error = vi.fn()
    const cleanup = attachAndroidBack(app, request, error)
    await tick(); fire(); expect(exitApp).not.toHaveBeenCalled()
    request.mockReturnValue(false); fire(); await tick(); expect(exitApp).toHaveBeenCalledTimes(1)
    cleanup(); fire(); expect(remove).toHaveBeenCalledTimes(1); expect(exitApp).toHaveBeenCalledTimes(1); expect(error).not.toHaveBeenCalled()
  })
  it('removes late registrations after disposal and never acts on their callbacks', async () => {
    let registered!: (handle: { remove: () => Promise<void> }) => void, callback!: () => void
    const remove = vi.fn(async () => {}), exitApp = vi.fn(async () => {}), request = vi.fn(() => false)
    const cleanup = attachAndroidBack({ addListener: (_event, handler) => { callback = handler; return new Promise(resolve => { registered = resolve }) }, exitApp }, request, vi.fn())
    cleanup(); callback(); registered({ remove }); await tick()
    expect(remove).toHaveBeenCalledTimes(1); expect(request).not.toHaveBeenCalled(); expect(exitApp).not.toHaveBeenCalled()
  })
  it('reports registration and exit failures, and permits retry after an exit failure', async () => {
    const error = vi.fn()
    attachAndroidBack({ addListener: async () => { throw Error('registration') }, exitApp: async () => {} }, () => false, error)
    await tick(); expect(error).toHaveBeenCalledTimes(1)
    const { app, fire, exitApp } = plugin(); exitApp.mockRejectedValueOnce(Error('exit'))
    const cleanup = attachAndroidBack(app, () => false, error)
    await tick(); fire(); await tick(); expect(error).toHaveBeenCalledTimes(2)
    fire(); await tick(); expect(exitApp).toHaveBeenCalledTimes(2); cleanup()
  })
  it('reports a failing local handler without exiting the app', async () => {
    const { app, fire, exitApp } = plugin(), error = vi.fn()
    const cleanup = attachAndroidBack(app, () => { throw Error('navigation') }, error)
    await tick(); fire(); expect(error).toHaveBeenCalledTimes(1); expect(exitApp).not.toHaveBeenCalled(); cleanup()
  })
  it('does not report failures or navigate after unmounting', async () => {
    let fail!: (error: Error) => void
    const error = vi.fn(), cleanup = attachAndroidBack({ addListener: () => new Promise((_resolve, reject) => { fail = reject }), exitApp: async () => {} }, () => false, error)
    cleanup(); fail(Error('late failure')); await tick(); expect(error).not.toHaveBeenCalled()
  })
})
