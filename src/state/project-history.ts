import type { Project } from '../domain/types'

// String payload budget (UTF-16), separate from the bounded metadata overhead.
export const HISTORY_LIMITS = { actions: 50, bytes: 8 * 1024 * 1024 } as const
export interface HistoryEntry { readonly before: string; readonly after: string; readonly bytes: number }
export interface ProjectHistory { readonly entries: readonly HistoryEntry[]; readonly cursor: number; readonly bytes: number; readonly truncated: boolean }
export function emptyHistory(): ProjectHistory { return { entries: [], cursor: 0, bytes: 0, truncated: false } }
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item)
}
export function designSnapshot(project: Project): string {
  return stableJson({ rooms: project.rooms, openings: project.openings, furniture: project.furniture })
}
export function recordHistory(history: ProjectHistory, before: Project, after: Project, limits: { actions: number; bytes: number } = HISTORY_LIMITS): ProjectHistory {
  const a = designSnapshot(before), b = designSnapshot(after)
  if (a === b) return history
  const entry = { before: a, after: b, bytes: 2 * (a.length + b.length) }
  const entries = [...history.entries.slice(0, history.cursor), entry]
  let bytes = entries.reduce((total, item) => total + item.bytes, 0), truncated = history.truncated
  // An action too large to retain is a barrier: never jump across it.
  while (entries.length > limits.actions || bytes > limits.bytes) { bytes -= entries.shift()!.bytes; truncated = true }
  return { entries, cursor: entries.length, bytes, truncated }
}
export type HistoryDirection = 'undo' | 'redo'
export class ProjectChangeError extends Error {
  readonly code: 'busy' | 'unavailable' | 'stale'
  constructor(code: 'busy' | 'unavailable' | 'stale') { super(code); this.name = 'ProjectChangeError'; this.code = code }
}
export function historyCandidate(project: Project, history: ProjectHistory, direction: HistoryDirection, now: () => Date): { project: Project; history: ProjectHistory } {
  const undo = direction === 'undo', entry = history.entries[history.cursor - (undo ? 1 : 0)]
  if (!entry) throw new ProjectChangeError('unavailable')
  if (designSnapshot(project) !== (undo ? entry.after : entry.before)) throw new ProjectChangeError('stale')
  const design: Pick<Project, 'rooms' | 'openings' | 'furniture'> = JSON.parse(undo ? entry.before : entry.after)
  return {
    project: { ...project, ...design, updatedAt: new Date(Math.max(now().getTime(), Date.parse(project.updatedAt))).toISOString() },
    history: { ...history, cursor: history.cursor + (undo ? -1 : 1) },
  }
}
