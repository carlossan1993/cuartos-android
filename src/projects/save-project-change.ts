import { DomainError } from '../domain/errors'
import { createProjectStore, projectStore } from '../state/project-store'
import { projectRepository, type ProjectRepository } from '../storage/project-repository'
import { saveStatus, type createSaveStatus } from '../state/save-status'

export interface SaveDependencies {
  repository?: Pick<ProjectRepository, 'replace'>
  store?: ReturnType<typeof createProjectStore>
  now?: () => Date
  status?: ReturnType<typeof createSaveStatus>
}
export async function saveProjectChange(update: (state: ReturnType<ReturnType<typeof createProjectStore>['getState']>) => void, dependencies: SaveDependencies = {}) {
  const store = dependencies.store ?? projectStore, previous = store.getState().project
  if (!previous) throw new DomainError('missing_project', 'project', 'no active project')
  // Prepare and validate in an isolated store; publish only after IDB commits.
  const candidate = createProjectStore({ now: dependencies.now })
  candidate.getState().loadProject(previous)
  update(candidate.getState())
  const saved = candidate.getState().project!
  const status = dependencies.status ?? saveStatus, token = status.begin(previous.id)
  try { await (dependencies.repository ?? projectRepository).replace(saved, previous) }
  catch (error) { status.finish(token, 'error'); throw error }
  // A late write must not switch the person back to an old project.
  if (store.getState().project === previous) store.getState().loadProject(saved)
  status.finish(token, 'saved')
  return saved
}
