import type { SurfaceMaterial } from '../domain/types'
import { roomWithFinish, type FinishTarget } from '../finishes/changes'
import { saveProjectChange, type SaveDependencies } from './save-project-change'

export function saveFinishChange(change: { roomId: string; target: FinishTarget; material: SurfaceMaterial }, dependencies: SaveDependencies = {}) {
  return saveProjectChange(state => {
    state.updateRoom(roomWithFinish(state.project!, change.roomId, change.target, change.material))
  }, dependencies)
}
