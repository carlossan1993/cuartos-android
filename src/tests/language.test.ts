import { describe, expect, it } from 'vitest'
import es from '../i18n/locales/es.json'
import en from '../i18n/locales/en.json'
import { resolveLanguage } from '../i18n/language'

function entries(value: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.assign({}, ...Object.entries(value).map(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof item === 'object' && item !== null
      ? entries(item as Record<string, unknown>, path)
      : { [path]: item }
  }))
}

describe('language selection', () => {
  it.each([
    ['en', ['es-EC'], 'en'],
    [null, ['fr-FR', 'en-US', 'es-EC'], 'en'],
    ['invalid', ['es-EC'], 'es'],
    [null, ['EN_gb'], 'en'],
    [null, ['fr-FR'], 'es'],
    [null, [], 'es'],
  ] as const)('resolves saved %s / device %j to %s', (saved, devices, expected) => {
    expect(resolveLanguage(saved, devices)).toBe(expected)
  })
})

describe('complete bilingual resources', () => {
  it('has identical keys and non-empty copy in both languages', () => {
    const spanish = entries(es)
    const english = entries(en)
    expect(Object.keys(spanish).sort()).toEqual(Object.keys(english).sort())
    for (const text of [...Object.values(spanish), ...Object.values(english)]) {
      expect(typeof text).toBe('string')
      expect(text.trim().length).toBeGreaterThan(0)
    }
  })
})
