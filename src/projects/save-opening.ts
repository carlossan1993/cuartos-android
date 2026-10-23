import type { Opening } from '../domain/types'
import { saveProjectChange, type SaveDependencies } from './save-project-change'

export type OpeningChange = { type: 'add' | 'update'; opening: Opening } | { type: 'remove'; id: string }
export function saveOpeningChange(change: OpeningChange, dependencies: SaveDependencies = {}) {
  return saveProjectChange(state => {
    if (change.type === 'remove') state.removeOpening(change.id)
    else if (change.type === 'add') state.addOpening(change.opening)
    else state.updateOpening(change.opening)
  }, dependencies)
}
