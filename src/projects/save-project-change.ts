import { DomainError } from '../domain/errors'
import { createProjectStore, projectStore } from '../state/project-store'
import { projectRepository, type ProjectRepository } from '../storage/project-repository'

export interface SaveDependencies {
  repository?: Pick<ProjectRepository, 'replace'>
  store?: ReturnType<typeof createProjectStore>
  now?: () => Date
}
export async function saveProjectChange(update: (state: ReturnType<ReturnType<typeof createProjectStore>['getState']>) => void, dependencies: SaveDependencies = {}) {
  const store = dependencies.store ?? projectStore, previous = store.getState().project
  if (!previous) throw new DomainError('missing_project', 'project', 'no active project')
  // Prepare and validate in an isolated store; publish only after IDB commits.
  const candidate = createProjectStore({ now: dependencies.now })
  candidate.getState().loadProject(previous)
  update(candidate.getState())
  const saved = candidate.getState().project!
  await (dependencies.repository ?? projectRepository).replace(saved, previous)
  // A late write must not switch the person back to an old project.
  if (store.getState().project === previous) store.getState().loadProject(saved)
  return saved
}
