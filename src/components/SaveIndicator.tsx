import { useStore } from 'zustand'
import { useTranslation } from 'react-i18next'
import { saveStatus } from '../state/save-status'

export function SaveIndicator({ projectId }: { projectId: string }) {
  const { t } = useTranslation(), state = useStore(saveStatus)
  const phase = state.projectId === projectId ? state.phase : 'saved'
  return <p className={`save-indicator save-${phase}`} role="status" aria-live="polite">{t(`projects.status.${phase}`)}</p>
}
