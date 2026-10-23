import { assertOpeningOutsideConnection } from '../geometry/layout'
import { createStore } from 'zustand/vanilla'
import { DomainError } from '../domain/errors'
import { cloneProject, createProject, deserializeProject, serializeProject } from '../domain/project'
import type { FurnitureItem, Opening, Project, Room, ViewSettings } from '../domain/types'
import { normalizeRotation } from '../geometry/units'

interface ProjectState {
  readonly project: Project | null
  newProject: (name: string, language: 'es' | 'en') => string
  loadProject: (project: Project) => void
  importProject: (json: string) => void
  exportProject: () => string
  closeProject: () => void
  renameProject: (name: string) => void
  addRoom: (room: Room) => void
  updateRoom: (room: Room) => void
  removeRoom: (id: string) => void
  addOpening: (opening: Opening) => void
  updateOpening: (opening: Opening) => void
  removeOpening: (id: string) => void
  addFurniture: (item: FurnitureItem) => void
  updateFurniture: (item: FurnitureItem) => void
  removeFurniture: (id: string) => void
  setViewSettings: (view: ViewSettings) => void
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep)
    Object.freeze(value)
  }
  return value
}
function snapshot(project: Project): Project { return freezeDeep(cloneProject(project)) }
function required(project: Project | null): Project {
  if (!project) throw new DomainError('missing_project', 'project', 'no active project')
  return project
}
function replace<T extends { readonly id: string }>(items: readonly T[], item: T): readonly T[] {
  if (!items.some(current => current.id === item.id)) throw new DomainError('not_found', item.id, 'entity not found')
  return items.map(current => current.id === item.id ? item : current)
}
function remove<T extends { readonly id: string }>(items: readonly T[], id: string): readonly T[] {
  if (!items.some(item => item.id === id)) throw new DomainError('not_found', id, 'entity not found')
  return items.filter(item => item.id !== id)
}

export function createProjectStore(dependencies: { now?: () => Date; id?: () => string } = {}) {
  const now = dependencies.now ?? (() => new Date())
  const id = dependencies.id ?? (() => crypto.randomUUID())
  const store = createStore<ProjectState>()((set, get) => {
    const edit = (update: (project: Project) => Project) => {
      const current = required(get().project)
      const updated = update(current)
      // A clock adjustment must not make updatedAt precede an imported project.
      const updatedAt = new Date(Math.max(now().getTime(), Date.parse(current.updatedAt))).toISOString()
      const next = snapshot({ ...updated, updatedAt })
      // Validation/copy finish before publication; a failed edit is atomic.
      set({ project: next })
    }
    return {
      project: null,
      newProject: (name, language) => {
        const project = snapshot(createProject({ id: id(), name, language, now: now().toISOString() }))
        set({ project })
        return project.id
      },
      loadProject: project => { const next = snapshot(project); set({ project: next }) },
      importProject: json => { const next = snapshot(deserializeProject(json)); set({ project: next }) },
      exportProject: () => serializeProject(required(get().project)),
      closeProject: () => set({ project: null }),
      renameProject: name => edit(project => ({ ...project, name: name.trim() })),
      addRoom: room => edit(project => ({ ...project, rooms: [...project.rooms, room] })),
      updateRoom: room => edit(project => ({ ...project, rooms: replace(project.rooms, room) })),
      removeRoom: roomId => edit(project => ({
        ...project, rooms: remove(project.rooms, roomId),
        openings: project.openings.filter(item => item.roomId !== roomId),
        furniture: project.furniture.filter(item => item.roomId !== roomId),
      })),
      addOpening: opening => edit(project => { assertOpeningOutsideConnection(opening, project); return { ...project, openings: [...project.openings, opening] } }),
      updateOpening: opening => edit(project => { assertOpeningOutsideConnection(opening, project); return { ...project, openings: replace(project.openings, opening) } }),
      removeOpening: openingId => edit(project => ({ ...project, openings: remove(project.openings, openingId) })),
      addFurniture: item => edit(project => ({ ...project, furniture: [...project.furniture, { ...item, rotation: normalizeRotation(item.rotation) }] })),
      updateFurniture: item => edit(project => ({ ...project, furniture: replace(project.furniture, { ...item, rotation: normalizeRotation(item.rotation) }) })),
      removeFurniture: itemId => edit(project => ({ ...project, furniture: remove(project.furniture, itemId) })),
      setViewSettings: viewSettings => edit(project => ({ ...project, viewSettings })),
    }
  })
  // Compatible with Zustand useStore selectors, without exposing an unchecked
  // setState escape hatch to renderers or storage adapters.
  return { getState: store.getState, getInitialState: store.getInitialState, subscribe: store.subscribe }
}

export const projectStore = createProjectStore()
