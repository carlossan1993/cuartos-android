import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project } from '../domain/types'
import { FileError, jsonFile, type ExportFile } from './project-files'
import { deliverFile, nativeFiles } from './file-delivery'

export function ExportProject({ project, onBusy }: { project: Project; onBusy: (busy: boolean) => void }) {
  const { t } = useTranslation(), [format, setFormat] = useState<'json' | 'png'>('json'), [width, setWidth] = useState(2048)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null), [error, setError] = useState(false)
  const pending = useRef(false), cached = useRef<{ project: Project; key: string; file: ExportFile } | null>(null)
  async function send(mode: 'save' | 'share') {
    if (pending.current) return
    pending.current = true; setBusy(true); onBusy(true); setMessage(null); setError(false)
    try {
      const key = `${format}-${width}`
      if (cached.current?.project !== project || cached.current.key !== key) {
        const file = format === 'json' ? jsonFile(project) : await (await import('./export-plan')).pngFile(project, width)
        cached.current = { project, key, file }
      }
      const outcome = await deliverFile(cached.current.file, mode, t('files.shareTitle', { name: project.name }))
      setMessage(`files.delivery.${outcome}`)
    } catch (cause) { setError(true); setMessage(`files.errors.${cause instanceof FileError ? cause.code : 'write'}`) }
    finally { pending.current = false; setBusy(false); onBusy(false) }
  }
  return <section className="file-panel" aria-labelledby="export-title" aria-busy={busy}>
    <p className="eyebrow">{t('files.eyebrow')}</p><h2 id="export-title">{t('files.exportTitle')}</h2><p className="form-help">{t('files.exportHelp')}</p>
    <div className="file-options"><div className="form-field"><label htmlFor="export-format">{t('files.format')}</label><select id="export-format" value={format} disabled={busy} onChange={event => { setFormat(event.target.value as 'json' | 'png'); setMessage(null) }}><option value="json">{t('files.json')}</option><option value="png">{t('files.png')}</option></select></div>
      {format === 'png' && <div className="form-field"><label htmlFor="export-resolution">{t('files.resolution')}</label><select id="export-resolution" value={width} disabled={busy} onChange={event => { setWidth(Number(event.target.value)); setMessage(null) }}><option value={1024}>1024 × 768 px</option><option value={2048}>2048 × 1536 px</option></select></div>}
    </div>
    {format === 'png' && <p className="form-help">{t('files.pngHelp')}</p>}
    <div className="action-group"><button className="button button-primary" type="button" disabled={busy || format === 'png' && !project.rooms.length} onClick={() => { void send('save') }}>{t(busy ? 'files.preparing' : nativeFiles() ? 'files.save' : 'files.download')}</button>{nativeFiles() && <button className="button button-secondary" type="button" disabled={busy || format === 'png' && !project.rooms.length} onClick={() => { void send('share') }}>{t('files.share')}</button>}</div>
    {message && <p className={error ? 'error-notice' : 'opening-saved'} role={error ? 'alert' : 'status'}>{t(message)}</p>}
  </section>
}
