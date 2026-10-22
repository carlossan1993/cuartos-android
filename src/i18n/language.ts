export const LANGUAGE_KEY = 'cuartos.language'
export type Language = 'es' | 'en'

export function resolveLanguage(saved: string | null, deviceLanguages: readonly string[]): Language {
  if (saved === 'es' || saved === 'en') return saved
  for (const locale of deviceLanguages) {
    const base = locale.trim().toLowerCase().split(/[-_]/)[0]
    if (base === 'es' || base === 'en') return base
  }
  return 'es'
}

export function readSavedLanguage(): string | null {
  try { return localStorage.getItem(LANGUAGE_KEY) } catch { return null }
}

export function saveLanguage(language: Language): void {
  try { localStorage.setItem(LANGUAGE_KEY, language) } catch { /* Session-only when storage is unavailable. */ }
}
