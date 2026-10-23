export type DomainErrorCode = 'invalid_value' | 'invalid_polygon' | 'invalid_reference' |
  'unsupported_schema' | 'invalid_json' | 'file_too_large' | 'missing_project' | 'not_found' |
  'opening_outside_wall' | 'opening_outside_height' | 'opening_overlap' | 'door_above_floor' | 'furniture_outside_room' | 'furniture_height'

// Internal diagnostics. UI maps code/path to translated copy.
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
