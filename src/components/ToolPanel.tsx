import { createPortal } from 'react-dom'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { projectStore } from '../state/project-store'
import { useBackAction } from '../navigation/use-back'
import { LanguagePicker } from './LanguagePicker'

export function ToolPanel({ labelId, onClose, blocked, busy, returnFocus, children }: {
  labelId: string; onClose: () => void; blocked?: () => boolean; busy: boolean; returnFocus: string; children: ReactNode
}) {
  const { t } = useTranslation(), dialog = useRef<HTMLDialogElement>(null)
  const close = () => { if (!busy && !blocked?.() && projectStore.getState().pending === null) onClose(); return true }
  useBackAction(close, 40)
  useEffect(() => {
    const element = dialog.current!, previous = document.activeElement
    const scroll = document.body.style.overflow, root = document.getElementById('root')!
    const inert = root.inert, hidden = root.getAttribute('aria-hidden')
    element.showModal(); document.body.style.overflow = 'hidden'; root.inert = true; root.setAttribute('aria-hidden', 'true')
    element.querySelector<HTMLElement>(`#${labelId}`)?.focus()
    return () => {
      root.inert = inert; if (hidden === null) root.removeAttribute('aria-hidden'); else root.setAttribute('aria-hidden', hidden)
      element.close(); document.body.style.overflow = scroll
      requestAnimationFrame(() => {
        const original = previous instanceof HTMLElement && previous.tabIndex >= 0 && previous.isConnected && !previous.matches(':disabled') && !previous.closest('dialog') ? previous : null
        const fallback = document.querySelector<HTMLElement>(returnFocus)
        ;(original ?? fallback)?.focus()
      })
    }
  }, [labelId, returnFocus])
  return createPortal(<dialog ref={dialog} className="tool-dialog" aria-labelledby={labelId} aria-modal="true" onCancel={event => { event.preventDefault(); close() }}
    onFocusCapture={event => {
      const target = event.target
      if (target instanceof HTMLElement && target.matches('input, select, textarea') && target.closest('.tool-dialog-content')) requestAnimationFrame(() => { if (target.isConnected) target.scrollIntoView({ block: 'nearest' }) })
    }}
    onKeyDown={event => {
      if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return
      const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')].filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length)
      const first = elements[0], last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
    <div className="tool-dialog-header"><LanguagePicker id="panel-language" /><button type="button" className="button button-quiet" disabled={busy} onClick={close} aria-label={t('navigation.closePanel')}><span aria-hidden="true">×</span> {t('navigation.close')}</button></div>
    <div className="tool-dialog-content">{children}</div>
  </dialog>, document.body)
}
