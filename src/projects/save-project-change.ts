import { cloneProject } from '../domain/project'
import type { Project } from '../domain/types'
import { createProjectStore, projectStore } from '../state/project-store'
import { historyCandidate, recordHistory, stableJson, type HistoryDirection, type ProjectHistory } from '../state/project-history'
import { projectRepository, type ProjectRepository } from '../storage/project-repository'
import { saveStatus, type createSaveStatus } from '../state/save-status'

export interface SaveDependencies {
  repository?: Pick<ProjectRepository, 'replace'>
  store?: ReturnType<typeof createProjectStore>
  now?: () => Date
  status?: ReturnType<typeof createSaveStatus>
}
async function persistChange(prepare: (previous: Project, history: ProjectHistory) => { project: Project; history: ProjectHistory } | null, dependencies: SaveDependencies) {
  const store = dependencies.store ?? projectStore, transaction = store.getState().beginSave()
  const status = dependencies.status ?? saveStatus
  let token: number | undefined
  try {
    const prepared = prepare(transaction.project, transaction.history)
    if (!prepared) return transaction.project
    // Validate before touching storage; neither publication nor cursor precede commit.
    const saved = cloneProject(prepared.project)
    token = status.begin(saved.id)
    await (dependencies.repository ?? projectRepository).replace(saved, transaction.project)
    store.getState().commitSavedProject(saved, prepared.history, transaction)
    status.finish(token, 'saved')
    return saved
  } catch (error) { if (token !== undefined) status.finish(token, 'error'); throw error }
  finally { store.getState().finishSave(transaction) }
}
export function saveProjectChange(update: (state: ReturnType<ReturnType<typeof createProjectStore>['getState']>) => void, dependencies: SaveDependencies = {}) {
  return persistChange((previous, history) => {
    const candidate = createProjectStore({ now: dependencies.now })
    candidate.getState().loadProject(previous)
    update(candidate.getState())
    const saved = candidate.getState().project!
    // Ignore timestamp-only/no-op confirmations, preserving redo and dates.
    if (stableJson({ ...saved, updatedAt: previous.updatedAt }) === stableJson(previous)) return null
    return { project: saved, history: recordHistory(history, previous, saved) }
  }, dependencies)
}
export function saveHistoryChange(direction: HistoryDirection, dependencies: SaveDependencies = {}) {
  return persistChange((previous, history) => historyCandidate(previous, history, direction, dependencies.now ?? (() => new Date())), dependencies)
}
