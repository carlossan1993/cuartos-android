export function createBackController(blocked: () => boolean = () => false) {
  let sequence = 0, dispatching = false
  const entries = new Map<number, { priority: number; handle: () => boolean }>()
  return {
    add(handle: () => boolean, priority: number) {
      const id = ++sequence
      entries.set(id, { handle, priority })
      return () => { entries.delete(id) }
    },
    request(): boolean {
      if (dispatching || blocked()) return true
      dispatching = true
      try {
        const ordered = [...entries].sort(([a, x], [b, y]) => y.priority - x.priority || b - a)
        for (const [id, entry] of ordered) if (entries.has(id) && entry.handle()) return true
        return false
      } finally { dispatching = false }
    },
  }
}
interface ListenerHandle { remove: () => Promise<void> }
export interface AndroidBackPlugin {
  addListener: (event: 'backButton', handler: () => void) => Promise<ListenerHandle>
  exitApp: () => Promise<void>
}
export function attachAndroidBack(plugin: AndroidBackPlugin, request: () => boolean, onError: () => void) {
  let disposed = false, handle: ListenerHandle | undefined, exiting = false
  const fail = () => { if (!disposed) onError() }
  void plugin.addListener('backButton', () => {
    if (disposed || exiting) return
    try { if (request()) return } catch { fail(); return }
    exiting = true
    void plugin.exitApp().catch(fail).finally(() => { exiting = false })
  }).then(listener => { if (disposed) void listener.remove().catch(() => {}); else handle = listener }).catch(fail)
  return () => { disposed = true; if (handle) void handle.remove().catch(() => {}) }
}
