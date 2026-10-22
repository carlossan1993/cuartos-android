import { useId } from 'react'
import { useTranslation } from 'react-i18next'

/** Read-only, proportional preview. The interactive editor comes separately. */
export function RoomPreview({ width, depth }: { width: number; depth: number }) {
  const { t, i18n } = useTranslation()
  const gridId = useId()
  const format = (n: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 4 }).format(n)
  const scale = Math.min(340 / width, 210 / depth)
  const w = width * scale, h = depth * scale
  const x = (480 - w) / 2, y = (300 - h) / 2 - 10
  const widthLabel = `${format(width)} m`, depthLabel = `${format(depth)} m`
  return (
    <svg className="room-preview" viewBox="0 0 480 300" role="img" aria-label={t('room.previewLabel', { width: widthLabel, depth: depthLabel })}>
      <defs><pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#dcdde7" strokeWidth="0.6" /></pattern></defs>
      <rect width="480" height="300" rx="18" fill={`url(#${gridId})`} />
      <rect x={x} y={y} width={w} height={h} fill="#fcfbf7" stroke="#03038c" strokeWidth="5" strokeLinejoin="round" />
      <path d={`M${x} ${y + h + 15}v12m0 -6h${w}m0 -6v12`} fill="none" stroke="#626a80" />
      <text x="240" y={y + h + 43} textAnchor="middle" fill="#03038c" fontSize="15">{widthLabel}</text>
      <path d={`M${x - 15} ${y}h-12m6 0v${h}m-6 0h12`} fill="none" stroke="#626a80" />
      <text transform={`translate(${x - 36} 140) rotate(-90)`} textAnchor="middle" fill="#03038c" fontSize="15">{depthLabel}</text>
    </svg>
  )
}
