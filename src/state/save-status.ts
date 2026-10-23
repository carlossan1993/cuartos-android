import { createStore } from 'zustand/vanilla'

export function createSaveStatus() {
  const store = createStore<{ projectId: string | null; phase: 'saving' | 'saved' | 'error'; token: number }>()(() => ({ projectId: null, phase: 'saved', token: 0 }))
  return { ...store,
    loaded(projectId: string) { store.setState({ projectId, phase: 'saved', token: store.getState().token + 1 }) },
    begin(projectId: string) { const token = store.getState().token + 1; store.setState({ projectId, phase: 'saving', token }); return token },
    finish(token: number, phase: 'saved' | 'error') { if (store.getState().token === token) store.setState({ phase }) },
  }
}
export const saveStatus = createSaveStatus()
