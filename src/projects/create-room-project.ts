import { createProjectStore, projectStore } from '../state/project-store'
import { projectRepository, type ProjectRepository } from '../storage/project-repository'
import { projectFromRoomDraft, type RoomDraft } from './room-draft'

export async function createRoomProject(draft: RoomDraft, language: 'es' | 'en', dependencies: {
  repository?: Pick<ProjectRepository, 'create'>
  store?: ReturnType<typeof createProjectStore>
  id?: () => string
  now?: () => Date
} = {}) {
  const project = projectFromRoomDraft(draft, language, {
    id: dependencies.id ?? (() => crypto.randomUUID()), now: dependencies.now ?? (() => new Date()),
  })
  await (dependencies.repository ?? projectRepository).create(project)
  // Only publish a successfully saved, validated project. A quota/permission
  // error leaves the active project and the user's form intact.
  const store = dependencies.store ?? projectStore
  store.getState().loadProject(project)
  return project
}
