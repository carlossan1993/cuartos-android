import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { projectStore, type ProjectTransaction } from '../state/project-store'
import { ProjectChangeError, type HistoryDirection, type ProjectHistory } from '../state/project-history'
import { saveHistoryChange } from '../projects/save-project-change'
import { projectRepository, ProjectSaveError } from '../storage/project-repository'
import { saveStatus } from '../state/save-status'

interface Feedback { session: number; history: ProjectHistory; key: string; error: boolean; recover: boolean }
export function HistoryControls({ disabled = false, onReload }: { disabled?: boolean; onReload?: () => void }) {
  const { t } = useTranslation(), state = useStore(projectStore)
  const [feedback, setFeedback] = useState<Feedback | null>(null), lock = useRef(false), pointers = useRef(new Set<number>())
  const currentFeedback = feedback?.session === state.session && feedback.history === state.history ? feedback : null
  const busy = state.pending !== null, undo = state.history.cursor > 0, redo = state.history.cursor < state.history.entries.length
  const blocked = disabled || busy
  function report(key: string, error: boolean, recover = false) {
    const current = projectStore.getState()
    setFeedback({ session: current.session, history: current.history, key, error, recover })
  }
  async function change(direction: HistoryDirection) {
    if (blocked || lock.current) return
    lock.current = true; setFeedback(null)
    const session = projectStore.getState().session
    try { await saveHistoryChange(direction); if (projectStore.getState().session === session) report(`history.${direction}Done`, false) }
    catch (error) {
      if (projectStore.getState().session === session) {
        const code = error instanceof ProjectSaveError || error instanceof ProjectChangeError ? error.code : 'failed'
        report(`history.errors.${code}`, true, ['conflict', 'missing', 'unreadable', 'stale'].includes(code))
      }
    } finally { lock.current = false }
  }
  async function reload() {
    if (blocked || lock.current) return
    lock.current = true
    const session = projectStore.getState().session
    let transaction: ProjectTransaction | undefined
    try {
      transaction = projectStore.getState().beginSave()
      const saved = await projectRepository.get(transaction.project.id), current = projectStore.getState()
      if (current.session !== transaction.session || current.project !== transaction.project) return
      current.loadProject(saved); saveStatus.loaded(saved.id); onReload?.(); report('history.reloaded', false)
    } catch (error) {
      if (projectStore.getState().session === session) report(error instanceof ProjectSaveError || error instanceof ProjectChangeError ? `history.errors.${error.code}` : 'history.errors.reload', true, true)
    } finally { if (transaction) projectStore.getState().finishSave(transaction); lock.current = false }
  }
  // Refs keep provisional pointer gestures out of keyboard history, including a
  // key pressed before React has rendered the pointer-down state.
  useEffect(() => {
    const down = (event: PointerEvent) => { pointers.current.add(event.pointerId) }
    const up = (event: PointerEvent) => { pointers.current.delete(event.pointerId) }
    const clear = () => pointers.current.clear()
    window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); window.addEventListener('blur', clear)
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('blur', clear) }
  }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target
      if (blocked || lock.current || pointers.current.size || event.defaultPrevented || event.isComposing || event.repeat || event.altKey || !(event.ctrlKey || event.metaKey)) return
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, form, [role="textbox"]'))) return
      const key = event.key.toLowerCase(), direction = key === 'z' ? event.shiftKey ? 'redo' : 'undo' : key === 'y' && event.ctrlKey && !event.shiftKey ? 'redo' : null
      if (!direction || !(direction === 'undo' ? undo : redo)) return
      event.preventDefault(); void change(direction)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  return <div className="history-panel" aria-busy={busy}>
    <div className="history-actions" role="group" aria-label={t('history.title')}>
      <button className="button button-secondary" type="button" disabled={blocked || !undo} aria-keyshortcuts="Control+z Meta+z" onClick={() => { void change('undo') }}><span aria-hidden="true">↶</span> {t('history.undo')}</button>
      <button className="button button-secondary" type="button" disabled={blocked || !redo} aria-keyshortcuts="Control+Shift+z Meta+Shift+z Control+y" onClick={() => { void change('redo') }}><span aria-hidden="true">↷</span> {t('history.redo')}</button>
      <span className="history-count">{t('history.count', { undo: state.history.cursor, redo: state.history.entries.length - state.history.cursor })}</span>
    </div>
    <details className="history-help"><summary>{t('history.scopeTitle')}</summary><p>{t('history.scope')}</p><p>{t('history.shortcuts')}</p>{state.history.truncated && <p>{t('history.limit')}</p>}</details>
    {currentFeedback && <div className={currentFeedback.error ? 'error-notice history-feedback' : 'history-feedback'} role={currentFeedback.error ? 'alert' : 'status'}><p>{t(currentFeedback.key)}</p>{currentFeedback.error && <p>{t('history.retryHelp')}</p>}{currentFeedback.recover && <button type="button" className="button button-secondary" disabled={blocked} onClick={() => { void reload() }}>{t('history.reload')}</button>}</div>}
  </div>
}
