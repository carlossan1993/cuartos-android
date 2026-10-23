import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project } from '../domain/types'
import { projectRepository, ProjectSaveError } from '../storage/project-repository'
import { copyProject } from './project-copy'

export type ProjectAction = 'rename' | 'duplicate' | 'remove'
export function ProjectManager({ projectId, action, onCancel, onDone }: { projectId: string; action: ProjectAction; onCancel: () => void; onDone: (action: ProjectAction) => void }) {
  const { t } = useTranslation(), [source, setSource] = useState<Project | null>(null), [name, setName] = useState('')
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [invalid, setInvalid] = useState(false)
  const [issue, setIssue] = useState<string | null>(null), [revision, setRevision] = useState(0)
  const pending = useRef(false), heading = useRef<HTMLHeadingElement>(null), input = useRef<HTMLInputElement>(null), copy = useRef<Project | null>(null)
  const load = useCallback(() => { setLoading(true); setIssue(null); copy.current = null; setRevision(n => n + 1) }, [])
  useEffect(() => {
    let active = true
    void projectRepository.get(projectId).then(project => {
      if (!active) return
      setSource(project)
      setName(current => revision && current ? current : action === 'duplicate' ? t('projects.copyName', { name: project.name.slice(0, 100) }) : project.name)
    }).catch(() => { if (active) { setSource(null); setIssue('projects.errors.read') } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // Language changes translate the form without discarding its draft or rereading the source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, action, revision])
  useEffect(() => { if (!loading) { if (action === 'remove' || !source) heading.current?.focus(); else input.current?.focus() } }, [loading, action, source])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!source || pending.current || loading) return
    if (action !== 'remove' && (!name.trim() || name.trim().length > 120)) { setInvalid(true); input.current?.focus(); return }
    pending.current = true; setBusy(true); setIssue(null)
    try {
      if (action === 'remove') await projectRepository.remove(source)
      else if (action === 'rename') await projectRepository.replace({ ...source, name: name.trim(), updatedAt: new Date(Math.max(Date.now(), Date.parse(source.updatedAt))).toISOString() }, source)
      else {
        if (!copy.current || copy.current.name !== name.trim()) copy.current = copyProject(source, name, { id: () => crypto.randomUUID(), now: () => new Date() })
        await projectRepository.copy(copy.current, source)
      }
      onDone(action)
    } catch (error) { setIssue(error instanceof ProjectSaveError ? `projects.errors.${error.code}` : 'projects.errors.write') }
    finally { pending.current = false; setBusy(false) }
  }
  return <section className="project-manager" aria-labelledby="project-manager-title" aria-busy={loading || busy}>
    <h3 id="project-manager-title" tabIndex={-1} ref={heading}>{t(`projects.${action}`)}</h3>
    {loading ? <p role="status">{t('storage.loading')}</p> : <>
      {source && <><p className="manager-source">{source.name}</p><form noValidate onSubmit={event => { void submit(event) }}>
        {action === 'remove' ? <p className="manager-confirmation">{t('projects.confirmRemove', { name: source.name })}</p> : <div className="form-field"><label htmlFor="managed-project-name">{t('wizard.projectName')}</label><input id="managed-project-name" ref={input} type="text" maxLength={120} value={name} disabled={busy} aria-invalid={invalid} onChange={event => { setName(event.target.value); setInvalid(false); copy.current = null }} />{invalid && <p className="field-error" role="alert">{t('projects.errors.name')}</p>}</div>}
        <div className="form-actions"><button type="button" className="button button-quiet" disabled={busy} onClick={onCancel}>{t('common.cancel')}</button><button type="submit" className={`button ${action === 'remove' ? 'button-danger' : 'button-primary'}`} disabled={busy}>{t(busy ? 'wizard.saving' : action === 'remove' ? 'projects.confirmDelete' : action === 'duplicate' ? 'projects.createCopy' : 'projects.saveName')}</button></div>
      </form></>}
      {issue && <div className="error-notice" role="alert"><p>{t(issue)}</p>{(issue === 'projects.errors.conflict' || !source) && <button className="button button-secondary" type="button" disabled={busy} onClick={load}>{t('projects.reload')}</button>}</div>}
      {!source && <button type="button" className="button button-quiet" onClick={onCancel}>{t('common.cancel')}</button>}
    </>}
  </section>
}
