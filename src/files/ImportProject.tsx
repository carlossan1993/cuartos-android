import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project } from '../domain/types'
import { copyProject } from '../projects/project-copy'
import { projectRepository } from '../storage/project-repository'
import { FileError, readProjectFile } from './project-files'

export function ImportProject({ onCancel, onImported }: { onCancel: () => void; onImported: (project: Project) => void }) {
  const { t } = useTranslation(), [source, setSource] = useState<Project | null>(null), [name, setName] = useState(''), [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false), [saving, setSaving] = useState(false), [issue, setIssue] = useState<string | null>(null), [invalid, setInvalid] = useState(false)
  const picker = useRef<HTMLInputElement>(null), input = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null), candidate = useRef<Project | null>(null), pending = useRef(false), revision = useRef(0)
  useEffect(() => { const tracker = revision; heading.current?.focus(); return () => { tracker.current++ } }, [])
  async function select(file: File | undefined) {
    if (!file || pending.current) return
    const token = ++revision.current
    setReading(true); setSource(null); candidate.current = null; setIssue(null); setInvalid(false); setFileName(file.name)
    try {
      const project = await readProjectFile(file)
      if (token === revision.current) { setSource(project); setName(t('files.importName', { name: project.name.slice(0, 100) })) }
    } catch (error) { if (token === revision.current) setIssue(`files.errors.${error instanceof FileError ? error.code : 'read'}`) }
    finally { if (token === revision.current) setReading(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!source || reading || pending.current) return
    if (!name.trim() || name.trim().length > 120) { setInvalid(true); input.current?.focus(); return }
    pending.current = true; setSaving(true); setIssue(null)
    try {
      if (!candidate.current || candidate.current.name !== name.trim()) candidate.current = copyProject(source, name, { id: () => crypto.randomUUID(), now: () => new Date() })
      await projectRepository.create(candidate.current)
      onImported(candidate.current)
    } catch { setIssue('files.errors.import') }
    finally { pending.current = false; setSaving(false) }
  }
  return <section className="import-page" aria-labelledby="import-title" aria-busy={reading || saving}>
    <button type="button" className="button button-quiet back-link" disabled={saving} onClick={onCancel}>← {t('common.cancel')}</button><p className="eyebrow">{t('files.eyebrow')}</p><h1 id="import-title" className="page-title" ref={heading} tabIndex={-1}>{t('files.importTitle')}</h1><p className="intro">{t('files.importHelp')}</p>
    <div className="file-panel"><div className="form-field"><label htmlFor="import-project-file">{t('files.choose')}</label><input id="import-project-file" ref={picker} hidden type="file" accept=".json,application/json,text/json,text/plain" disabled={saving} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void select(file) }} /><button type="button" className="button button-secondary file-picker" disabled={saving} onClick={() => picker.current?.click()}>{t('files.selectFile')}</button><p className="file-name">{fileName || t('files.noFile')}</p></div><p className="form-help">{t('files.limit')}</p>
      {reading && <p role="status">{t('files.reading')}</p>}
      {source && <form noValidate onSubmit={event => { void submit(event) }}><div className="import-preview"><span className="small-label">{t('files.preview')}</span><h2>{source.name}</h2><p>{t('files.contents', { rooms: source.rooms.length, openings: source.openings.length, furniture: source.furniture.length })}</p></div><div className="form-field"><label htmlFor="import-project-name">{t('wizard.projectName')}</label><input id="import-project-name" ref={input} value={name} maxLength={120} disabled={saving} aria-invalid={invalid} onChange={event => { setName(event.target.value); candidate.current = null; setInvalid(false) }} />{invalid && <p className="field-error" role="alert">{t('projects.errors.name')}</p>}</div><div className="form-actions"><button className="button button-quiet" type="button" disabled={saving} onClick={onCancel}>{t('common.cancel')}</button><button className="button button-primary" type="submit" disabled={saving}>{t(saving ? 'wizard.saving' : 'files.confirmImport')}</button></div></form>}
      {issue && <p className="error-notice" role="alert">{t(issue)}</p>}
    </div>
  </section>
}
