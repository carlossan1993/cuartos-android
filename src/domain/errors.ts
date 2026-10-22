export type DomainErrorCode = 'invalid_value' | 'invalid_polygon' | 'invalid_reference' |
  'unsupported_schema' | 'invalid_json' | 'file_too_large' | 'missing_project' | 'not_found'

// Internal diagnostics. Future UI maps code/path to translated copy.
export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly path: string
  constructor(code: DomainErrorCode, path: string, detail: string) {
    super(`${path}: ${detail}`)
    this.name = 'DomainError'
    this.code = code
    this.path = path
  }
}
