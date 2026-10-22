import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project } from '../domain/types'
import { polygonArea } from '../geometry/rooms'
import { RoomPreview } from '../components/RoomPreview'

export function ProjectSummary({ project, onBack }: { project: Project; onBack: () => void }) {
  const { t, i18n } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [project.id])
  const room = project.rooms[0]
  const format = (n: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 4 }).format(n)
  const width = room ? Math.max(...room.polygon.map(p => p.x)) - Math.min(...room.polygon.map(p => p.x)) : 0
  const depth = room ? Math.max(...room.polygon.map(p => p.y)) - Math.min(...room.polygon.map(p => p.y)) : 0
  return (
    <section className="project-summary" aria-labelledby="project-name">
      <button type="button" className="button button-quiet back-link" onClick={onBack}>← {t('room.backToProjects')}</button>
      <div className="summary-heading"><div><p className="eyebrow">{t('room.yourSpace')}</p><h1 className="page-title" id="project-name" ref={heading} tabIndex={-1}>{project.name}</h1></div><p className="saved-badge"><span aria-hidden="true">✓</span> {t('room.saved')}</p></div>
      {room ? <div className="summary-grid">
        <figure className="summary-preview"><RoomPreview width={width} depth={depth} /><figcaption>{t('room.planCaption')}</figcaption></figure>
        <div className="room-details"><span className="small-label">{t('wizard.rectangle')}</span><h2>{room.name}</h2>
          <dl className="room-measures">
            <div><dt>{t('wizard.width')}</dt><dd>{format(width)} m</dd></div>
            <div><dt>{t('wizard.depth')}</dt><dd>{format(depth)} m</dd></div>
            <div><dt>{t('wizard.height')}</dt><dd>{format(room.height)} m</dd></div>
            <div><dt>{t('room.area')}</dt><dd>{new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 }).format(polygonArea(room.polygon))} m²</dd></div>
          </dl>
          <p className="form-help">{t('room.summaryNote')}</p>
        </div>
      </div> : <p>{t('room.noRoom')}</p>}
    </section>
  )
}
