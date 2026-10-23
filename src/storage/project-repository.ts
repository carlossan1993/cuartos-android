import { Dexie, type Table } from 'dexie'
import { deserializeProject, serializeProject } from '../domain/project'
import type { Project } from '../domain/types'

export const PROJECT_DATABASE = 'cuartos-local'
interface StoredProject { id: string; json: string }
export class ProjectSaveError extends Error {
  readonly code: 'conflict' | 'missing' | 'unreadable'
  constructor(code: 'conflict' | 'missing' | 'unreadable') { super(code); this.name = 'ProjectSaveError'; this.code = code }
}

export function createProjectRepository(name = PROJECT_DATABASE) {
  const db = new Dexie(name)
  db.version(1).stores({ projects: 'id' })
  const projects: Table<StoredProject, string> = db.table('projects')

  function decode(record: StoredProject): Project {
    const project = deserializeProject(record.json)
    if (project.id !== record.id) throw new Error('Stored project identifier mismatch')
    return project
  }

  return {
    async create(project: Project): Promise<void> {
      // Encode before the transaction; add refuses collisions instead of
      // replacing an existing design. Success means the IDB commit completed.
      const json = serializeProject(project)
      await projects.add({ id: project.id, json })
    },
    async get(id: string): Promise<Project> {
      const record = await projects.get(id)
      if (!record) throw new Error('Stored project not found')
      return decode(record)
    },
    async replace(project: Project, previous: Project): Promise<void> {
      const json = serializeProject(project), expected = serializeProject(previous)
      if (project.id !== previous.id || project.createdAt !== previous.createdAt || Date.parse(project.updatedAt) < Date.parse(previous.updatedAt)) throw new Error('Project identity/date mismatch')
      await db.transaction('rw', projects, async () => {
        const record = await projects.get(project.id)
        if (!record) throw new ProjectSaveError('missing')
        try { decode(record) } catch { throw new ProjectSaveError('unreadable') }
        if (record.json !== expected) throw new ProjectSaveError('conflict')
        await projects.update(project.id, { json })
      })
    },
    async list(): Promise<{ projects: Project[]; unreadable: number }> {
      const records = await projects.toArray()
      const result: Project[] = []
      let unreadable = 0
      for (const record of records) {
        try { result.push(decode(record)) } catch { unreadable++ }
      }
      result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
      // Invalid records remain untouched for future recovery/migrations.
      return { projects: result, unreadable }
    },
    close: () => db.close(),
  }
}

export type ProjectRepository = ReturnType<typeof createProjectRepository>
export const projectRepository = createProjectRepository()
