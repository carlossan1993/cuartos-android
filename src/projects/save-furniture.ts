import { DomainError } from '../domain/errors'
import type { FurnitureItem } from '../domain/types'
import { catalogItem } from '../furniture/catalog'
import { assertFurniturePlacement, initialPlacement } from '../furniture/geometry'
import { saveProjectChange, type SaveDependencies } from './save-project-change'

export type FurnitureChange = { type: 'add'; id: string; catalogId: string; roomId: string; snap: boolean } | { type: 'update'; item: FurnitureItem } | { type: 'duplicate'; id: string; sourceId: string; snap: boolean } | { type: 'remove'; id: string }
export async function saveFurnitureChange(change: FurnitureChange, dependencies: SaveDependencies = {}) {
  let changedId: string | null = null
  const project = await saveProjectChange(state => {
    const p = state.project!
    if (change.type === 'remove') { state.removeFurniture(change.id); return }
    let next: FurnitureItem
    if (change.type === 'update') next = change.item
    else if (change.type === 'add') {
      const catalog = catalogItem(change.catalogId), room = p.rooms.find(room => room.id === change.roomId)
      if (!catalog || !room) throw new DomainError('invalid_reference', 'catalogId', 'unknown catalog item or room')
      next = initialPlacement({ id: change.id, catalogId: catalog.catalogId, roomId: room.id, position: { x: 0, y: 0 }, rotation: 0, dimensions: { ...catalog.dimensions }, materialOverrides: {} }, room, p.viewSettings.gridSize, change.snap)
    } else {
      const source = p.furniture.find(item => item.id === change.sourceId)
      if (!source) throw new DomainError('not_found', 'furniture', 'missing duplicate source')
      const room = p.rooms.find(room => room.id === source.roomId)!
      next = initialPlacement({ ...source, id: change.id }, room, p.viewSettings.gridSize, change.snap, true)
    }
    const room = p.rooms.find(room => room.id === next.roomId)
    if (!room) throw new DomainError('invalid_reference', 'roomId', 'unknown furniture room')
    assertFurniturePlacement(next, room)
    if (change.type === 'update') state.updateFurniture(next)
    else state.addFurniture(next)
    changedId = next.id
  }, dependencies)
  return { project, changedId }
}
