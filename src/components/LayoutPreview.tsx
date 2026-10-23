import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { Room } from '../domain/types'
import { getWalls } from '../geometry/rooms'
import { roomLabelCell, visibleWallSpans, wallPoint } from '../geometry/layout'

export function LayoutPreview({ rooms }: { rooms: readonly Room[] }) {
  const { t } = useTranslation(), pattern = useId()
  const xs = rooms.flatMap(room => room.polygon.map(p => p.x)), ys = rooms.flatMap(room => room.polygon.map(p => p.y))
  const left = Math.min(...xs), top = Math.min(...ys), width = Math.max(...xs) - left, depth = Math.max(...ys) - top
  const scale = Math.min(360 / width, 220 / depth), x = (480 - width * scale) / 2, y = (300 - depth * scale) / 2
  const point = (p: { x: number; y: number }) => ({ x: x + (p.x - left) * scale, y: y + (p.y - top) * scale })
  return <svg className="room-preview layout-preview" viewBox="0 0 480 300" role="img" aria-label={t('layout.preview')}>
    <defs><pattern id={pattern} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#dcdde7" strokeWidth=".6" /></pattern></defs>
    <rect width="480" height="300" rx="18" fill={`url(#${pattern})`} />
    {rooms.map((room, i) => {
      const cell = roomLabelCell(room), label = point({ x: cell.left + cell.width / 2, y: cell.top + cell.depth / 2 })
      return <g key={room.id}><polygon points={room.polygon.map(p => { const q = point(p); return `${q.x},${q.y}` }).join(' ')} fill={i ? '#e7ebdf' : '#fcfbf7'} stroke="#dcdde7" />
        {getWalls(room).flatMap(wall => visibleWallSpans(room, wall, rooms).map((span, j) => { const a = point(wallPoint(wall, span.start)), b = point(wallPoint(wall, span.end)); return <line key={`${wall.id}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#03038c" strokeWidth="4" /> }))}
        <text x={label.x} y={label.y + 5} textAnchor="middle" fill="#03038c" fontSize="14">{i + 1}</text>
      </g>
    })}
  </svg>
}
