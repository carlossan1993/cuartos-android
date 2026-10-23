import { DomainError } from '../domain/errors'
import { deserializeProject, MAX_PROJECT_JSON_BYTES, serializeProject } from '../domain/project'
import type { Project } from '../domain/types'

export interface ExportFile { name: string; blob: Blob }
export class FileError extends Error {
  readonly code: 'read' | 'size' | 'invalid' | 'version' | 'empty' | 'image' | 'write'
  constructor(code: FileError['code']) { super(code); this.code = code; this.name = 'FileError' }
}

export function fileName(name: string, extension: 'json' | 'png') {
  const stem = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '').slice(0, 64) || 'cuartos'
  return `cuartos-${stem}.${extension}`
}
export function jsonFile(project: Project): ExportFile {
  return { name: fileName(project.name, 'json'), blob: new Blob([serializeProject(project)], { type: 'application/json' }) }
}
export async function readProjectFile(file: Pick<File, 'size' | 'arrayBuffer'>): Promise<Project> {
  if (file.size > MAX_PROJECT_JSON_BYTES) throw new FileError('size')
  let json: string
  try {
    const data = await file.arrayBuffer()
    if (data.byteLength > MAX_PROJECT_JSON_BYTES) throw new FileError('size')
    json = new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch (error) { throw error instanceof FileError ? error : new FileError('read') }
  try { return deserializeProject(json) }
  catch (error) { throw new FileError(error instanceof DomainError ? error.code === 'unsupported_schema' ? 'version' : error.code === 'file_too_large' ? 'size' : 'invalid' : 'invalid') }
}
