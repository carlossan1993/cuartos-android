import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { Room } from '../domain/types'
import { visibleWallSpans, wallInward, wallPoint } from '../geometry/layout'
import { getWalls } from '../geometry/rooms'
import { fitCamera, roomBounds, worldToScreen } from './viewport'

export function WallMap({ room, wallId, rooms = [room] }: { room: Room; wallId: string; rooms?: readonly Room[] }) {
  const { t } = useTranslation(), marker = useId()
  const camera = fitCamera(roomBounds([room]), { width: 260, height: 150 })
  const points = room.polygon.map(p => worldToScreen(p, camera))
  return <svg viewBox="0 0 260 150" className="wall-map" role="img" aria-label={t('openings.wallMap')}>
    <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#ad5728" /></marker></defs>
    <polygon points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="#f3f3fc" stroke="#b8bdcf" strokeWidth="1" strokeDasharray="3 3" />
    {getWalls(room).map((wall, i) => {
      const spans = visibleWallSpans(room, wall, rooms)
      const a = worldToScreen(wall.start, camera), b = worldToScreen(wall.end, camera), active = wall.id === wallId
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, inward = wallInward(room, wall)
      return <g key={wall.id}>{spans.map((span, j) => { const a = worldToScreen(wallPoint(wall, span.start), camera), b = worldToScreen(wallPoint(wall, span.end), camera); return <line key={j} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#03038c" strokeWidth="2" /> })}{active && <><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ad5728" strokeWidth="3" markerEnd={`url(#${marker})`} /><circle cx={a.x} cy={a.y} r="4" fill="#ad5728" /><text x={a.x + 7} y={a.y + 16} fill="#ad5728" fontSize="11">0</text></>}
        <text x={mid.x + inward.x * 13} y={mid.y + inward.y * 13 + 4} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 400} fill={active ? '#ad5728' : '#03038c'}>{spans.length ? t('openings.wallMarker', { number: i + 1 }) : t('layout.openPassage')}</text></g>
    })}
  </svg>
}

