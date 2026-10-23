import type { Opening } from '../domain/types'
import { DomainError } from '../domain/errors'
import { createProjectStore, projectStore } from '../state/project-store'
import { projectRepository, type ProjectRepository } from '../storage/project-repository'

export type OpeningChange = { type: 'add' | 'update'; opening: Opening } | { type: 'remove'; id: string }
export async function saveOpeningChange(change: OpeningChange, dependencies: {
  repository?: Pick<ProjectRepository, 'replace'>
  store?: ReturnType<typeof createProjectStore>
  now?: () => Date
} = {}) {
  const store = dependencies.store ?? projectStore, previous = store.getState().project
  if (!previous) throw new DomainError('missing_project', 'project', 'no active project')
  // Prepare/validate with the existing semantic actions, without publishing
  // unsaved data in the active store.
  const candidate = createProjectStore({ now: dependencies.now })
  candidate.getState().loadProject(previous)
  if (change.type === 'remove') candidate.getState().removeOpening(change.id)
  else if (change.type === 'add') candidate.getState().addOpening(change.opening)
  else candidate.getState().updateOpening(change.opening)
  const saved = candidate.getState().project!
  await (dependencies.repository ?? projectRepository).replace(saved, previous)
  // A late completion must not switch the person back to an old project.
  if (store.getState().project === previous) store.getState().loadProject(saved)
  return saved
}
