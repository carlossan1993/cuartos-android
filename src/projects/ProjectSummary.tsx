import { ConnectionSummary } from '../components/ConnectionSummary'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project } from '../domain/types'
import { layoutConnections } from '../geometry/layout'
import { polygonArea } from '../geometry/rooms'
import { LayoutPreview } from '../components/LayoutPreview'
import { RoomPreview } from '../components/RoomPreview'

export function ProjectSummary({ project, onBack, onOpenEditor }: { project: Project; onBack: () => void; onOpenEditor: () => void }) {
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
        <figure className="summary-preview">{project.rooms.length === 1 && room.polygon.length === 4 ? <RoomPreview width={width} depth={depth} /> : <LayoutPreview rooms={project.rooms} />}<figcaption>{t('room.planCaption')}</figcaption></figure>
        <div className="room-details"><span className="small-label">{t(project.rooms.length > 1 ? layoutConnections(project.rooms).length ? 'layout.connected' : 'layout.multiple' : room.polygon.length === 6 ? 'layout.l' : room.polygon.length > 4 ? 'layout.composite' : 'wizard.rectangle')}</span>
          {project.rooms.map(room => {
            const width = Math.max(...room.polygon.map(p => p.x)) - Math.min(...room.polygon.map(p => p.x)), depth = Math.max(...room.polygon.map(p => p.y)) - Math.min(...room.polygon.map(p => p.y))
            return <div className="summary-room" key={room.id}><h2>{room.name}</h2><dl className="room-measures">
              <div><dt>{t('wizard.width')}</dt><dd>{format(width)} m</dd></div>
              <div><dt>{t('wizard.depth')}</dt><dd>{format(depth)} m</dd></div>
              <div><dt>{t('wizard.height')}</dt><dd>{format(room.height)} m</dd></div>
              <div><dt>{t('room.area')}</dt><dd>{new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 }).format(polygonArea(room.polygon))} m²</dd></div>
            </dl></div>
          })}
          <ConnectionSummary rooms={project.rooms} /><p className="form-help">{t('room.summaryNote')}</p>
          <button className="button button-primary open-editor" type="button" onClick={onOpenEditor}>{t('editor.open')}</button>
        </div>
      </div> : <p>{t('room.noRoom')}</p>}
    </section>
  )
}
