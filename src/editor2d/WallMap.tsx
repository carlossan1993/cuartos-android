import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { Room } from '../domain/types'
import { getWalls } from '../geometry/rooms'
import { fitCamera, roomBounds, worldToScreen } from './viewport'

export function WallMap({ room, wallId }: { room: Room; wallId: string }) {
  const { t } = useTranslation(), marker = useId()
  const camera = fitCamera(roomBounds([room]), { width: 260, height: 150 })
  const points = room.polygon.map(p => worldToScreen(p, camera))
  const center = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length }
  return <svg viewBox="0 0 260 150" className="wall-map" role="img" aria-label={t('openings.wallMap')}>
    <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#ad5728" /></marker></defs>
    <polygon points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="#f3f3fc" stroke="#03038c" strokeWidth="2" />
    {getWalls(room).map((wall, i) => {
      const a = worldToScreen(wall.start, camera), b = worldToScreen(wall.end, camera), active = wall.id === wallId
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      return <g key={wall.id}>{active && <><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ad5728" strokeWidth="3" markerEnd={`url(#${marker})`} /><circle cx={a.x} cy={a.y} r="4" fill="#ad5728" /><text x={a.x + 7} y={a.y + 16} fill="#ad5728" fontSize="11">0</text></>}
        <text x={mid.x + (center.x - mid.x) * 0.22} y={mid.y + (center.y - mid.y) * 0.22 + 4} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 400} fill={active ? '#ad5728' : '#03038c'}>{t('openings.wallMarker', { number: i + 1 })}</text></g>
    })}
  </svg>
}

