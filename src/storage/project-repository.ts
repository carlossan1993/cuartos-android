import { Dexie, type Table } from 'dexie'
import { deserializeProject, serializeProject } from '../domain/project'
import type { Project } from '../domain/types'

export const PROJECT_DATABASE = 'cuartos-local'
interface StoredProject { id: string; json: string }

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
