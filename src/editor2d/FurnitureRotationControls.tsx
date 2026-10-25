import { useTranslation } from 'react-i18next'
import type { FurnitureItem, Room } from '../domain/types'
import { furnitureFits } from '../furniture/geometry'
import { worldToScreen } from './viewport'
import type { PlanScene } from './PlanDrawing'

export function FurnitureRotationControls({ item, scene, rooms, disabled, onTurn, onCancel }: {
  item: FurnitureItem; scene: PlanScene; rooms: readonly Room[]; disabled: boolean
  onTurn: (direction: -1 | 1) => void; onCancel: () => void
}) {
  const { t } = useTranslation()
  const center = worldToScreen(item.position, scene.camera)
  // Keep the targets still between quarter-turns so rapid repeated taps work.
  const top = center.y - Math.max(item.dimensions.width, item.dimensions.depth) * scene.camera.scale / 2
  const room = rooms.find(room => room.id === item.roomId)
  const invalid = !room || !furnitureFits(item, room)
  return <div className="furniture-rotation" role="group" aria-label={t('furniture.rotationControls')} data-rotation={item.rotation} data-invalid={invalid}
    style={{ left: Math.max(58, Math.min(scene.size.width - 58, center.x)), top: Math.max(28, Math.min(scene.size.height - 46, top - 30)) }}
    onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onPointerCancel={event => event.stopPropagation()} onLostPointerCapture={event => event.stopPropagation()}
    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); onCancel() } }}>
    <button type="button" disabled={disabled} aria-label={t('furniture.rotateLeft')} title={t('furniture.rotateLeft')} onClick={() => onTurn(-1)}>↶</button>
    <button type="button" disabled={disabled} aria-label={t('furniture.rotateRight')} title={t('furniture.rotateRight')} onClick={() => onTurn(1)}>↷</button>
    <output aria-live="polite" className={invalid ? 'rotation-invalid' : ''}>{item.rotation}°<span className="sr-only"> · {t('furniture.rotationHelp')}</span></output>
  </div>
}
