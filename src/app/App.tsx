import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { ProjectManager, type ProjectAction } from '../projects/ProjectManager'
import { SaveIndicator } from '../components/SaveIndicator'
import { saveStatus } from '../state/save-status'
import { RoomIllustration } from '../components/RoomIllustration'
import { saveLanguage, type Language } from '../i18n/language'
import { polygonArea } from '../geometry/rooms'
import { CreateProjectWizard } from '../projects/CreateProjectWizard'
import { ProjectSummary } from '../projects/ProjectSummary'
import { projectStore } from '../state/project-store'
import { projectRepository } from '../storage/project-repository'
import type { Project } from '../domain/types'
import { ImportProject } from '../files/ImportProject'

interface ProjectCard { id: string; name: string; roomName: string; area: number }
const Viewer3D = lazy(() => import('../viewer3d/Viewer3D'))
const Editor2D = lazy(() => import('../editor2d/Editor2D'))

export function App() {
  const { t, i18n } = useTranslation()
  const project = useStore(projectStore, state => state.project)
  const [screen, setScreen] = useState<'home' | 'create' | 'import' | 'project' | 'editor' | '3d'>('home')
  const [cards, setCards] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(false)
  const [unreadable, setUnreadable] = useState(false)
  const [openError, setOpenError] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
  const [management, setManagement] = useState<{ id: string; action: ProjectAction } | null>(null)
  const [managed, setManaged] = useState<ProjectAction | null>(null)
  const [reload, setReload] = useState(0)
  const openingLock = useRef(false)
  const homeHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'es'
    document.title = t('app.title')
  }, [i18n.resolvedLanguage, t])

  useEffect(() => {
    if (screen !== 'home') return
    let active = true
    void projectRepository.list().then(result => {
      if (!active) return
      setCards(result.projects.map(p => ({ id: p.id, name: p.name, roomName: p.rooms.map(room => room.name).join(' / '), area: p.rooms.reduce((sum, room) => sum + polygonArea(room.polygon), 0) })))
      setUnreadable(result.unreadable > 0)
    }).catch(() => { if (active) setListError(true) }).finally(() => { if (active) setLoading(false) })
    homeHeading.current?.focus()
    return () => { active = false }
  }, [screen, reload])

  function managedProject(action: ProjectAction) { setManagement(null); setManaged(action); setLoading(true); setListError(false); setReload(n => n + 1) }
  function goHome() {
    projectStore.getState().closeProject()
    setLoading(true); setListError(false); setOpenError(false); setScreen('home')
  }
  function retryList() { setLoading(true); setListError(false); setReload(n => n + 1) }
  function importedProject(saved: Project) { projectStore.getState().loadProject(saved); saveStatus.loaded(saved.id); setScreen('project') }
  async function openProject(id: string) {
    if (openingLock.current || management || loading) return
    openingLock.current = true
    setOpening(id); setOpenError(false)
    try {
      const saved = await projectRepository.get(id)
      projectStore.getState().loadProject(saved)
      saveStatus.loaded(saved.id)
      setScreen('project')
    } catch { setOpenError(true) }
    finally { openingLock.current = false; setOpening(null) }
  }

  function changeLanguage(language: Language) {
    saveLanguage(language)
    void i18n.changeLanguage(language)
  }

  return (
    <div className="app-shell">
      <header className="header">
        <a className="brand" href="#main" aria-label={t('app.name')}>
          <img src="/icon.svg" alt="" width="40" height="40" />
          <span>{t('app.name')}<span className="brand-dot">.</span></span>
        </a>
        <div className="language-control">
          <label htmlFor="language">{t('language.label')}</label>
          <select id="language" value={i18n.resolvedLanguage} onChange={e => changeLanguage(e.target.value as Language)}>
            <option value="es">{t('language.spanish')}</option>
            <option value="en">{t('language.english')}</option>
          </select>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {project && <SaveIndicator projectId={project.id} />}
        {screen === 'import' ? <ImportProject onCancel={goHome} onImported={importedProject} /> : screen === 'create' ? <CreateProjectWizard onCancel={goHome} onCreated={() => setScreen('project')} /> : screen === 'editor' && project ? <Suspense fallback={<p role="status">{t('editor.loading')}</p>}><Editor2D key={project.id} project={project} onBack={() => setScreen('project')} onOpen3D={() => setScreen('3d')} /></Suspense> : screen === '3d' && project ? <Suspense fallback={<p role="status">{t('viewer.loading')}</p>}><Viewer3D key={project.id} project={project} onBack={() => setScreen('editor')} /></Suspense> : screen === 'project' && project ? <ProjectSummary project={project} onBack={goHome} onOpenEditor={() => setScreen('editor')} /> : <>
        <section className="hero" aria-labelledby="welcome-title">
          <div className="hero-copy">
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h1 id="welcome-title" ref={homeHeading} tabIndex={-1}>{t('home.title')}</h1>
            <p className="intro">{t('home.description')}</p>
            <button type="button" className="button button-primary create-button" disabled={opening !== null || !!management} onClick={() => { setManaged(null); setScreen('create') }}><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M10 3v14M3 10h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>{t('home.create')}</button>
            <button type="button" className="button button-secondary import-button" disabled={opening !== null || !!management} onClick={() => { setManaged(null); setScreen('import') }}>{t('files.openImport')}</button>
            <p className="local-note"><span aria-hidden="true">◌</span>{t('home.localNote')}</p>
          </div>
          <figure className="plan-card">
            <RoomIllustration />
            <figcaption>{t('home.planCaption')}</figcaption>
          </figure>
        </section>
        <section className="projects" aria-labelledby="projects-title">
          <div className="section-heading"><span className="section-marker" aria-hidden="true" /><h2 id="projects-title">{t('home.projects')}</h2></div>
          {management && <ProjectManager key={`${management.id}-${management.action}`} projectId={management.id} action={management.action} onCancel={() => setManagement(null)} onDone={managedProject} />}
          {managed && <p className="opening-saved" role="status">{t(`projects.done.${managed}`)}</p>}
          {loading && <p role="status">{t('storage.loading')}</p>}
          {listError && <div className="error-notice" role="alert">{t('storage.listError')} <button className="button button-secondary" type="button" onClick={retryList}>{t('common.retry')}</button></div>}
          {unreadable && !loading && <p className="error-notice" role="alert">{t('storage.unreadable')}</p>}
          {openError && <p className="error-notice" role="alert">{t('storage.openError')}</p>}
          {cards.length > 0 ? <ul className="project-list">{cards.map(card => <li key={card.id}><button type="button" className="project-card" disabled={opening !== null || !!management || loading} onClick={() => { void openProject(card.id) }} aria-label={`${t('home.open')}: ${card.name}`}>
            <span className="project-card-icon" aria-hidden="true">▱</span><span className="project-card-copy"><strong>{card.name}</strong><span>{card.roomName}{card.roomName && ' · '}{new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 }).format(card.area)} m²</span><small>{t('home.savedLocally')}</small></span><span className="project-card-arrow" aria-hidden="true">↗</span>
          </button><div className="project-card-actions" role="group" aria-label={t('projects.actions', { name: card.name })}>{(['rename', 'duplicate', 'remove'] as const).map(action => <button type="button" className={`button button-quiet ${action === 'remove' ? 'danger-button' : ''}`} key={action} disabled={opening !== null || !!management || loading} onClick={() => { setManaged(null); setManagement({ id: card.id, action }) }}>{t(`projects.${action}`)}</button>)}</div></li>)}</ul> : !loading && !listError && <div className="empty-state">
            <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 22h18V8m0 14v18m0-12h14" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            <div><h3>{t('home.emptyTitle')}</h3><p>{t('home.emptyDescription')}</p></div>
          </div>}
        </section>
        </>}
      </main>
      <footer>{t('home.footer')}</footer>
    </div>
  )
}
