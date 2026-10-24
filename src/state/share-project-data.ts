/** Reuse byte-identical JSON branches after validation/copy, without changing key
 * order: repository CAS compares the exact serialized record on the next save. */
export function shareProjectData<T>(previous: T, next: T): T {
  if (Object.is(previous, next)) return previous
  if (!previous || !next || typeof previous !== 'object' || typeof next !== 'object') return next
  if (Array.isArray(previous) && Array.isArray(next)) {
    const byId = new Map(previous.flatMap(value =>
      value && typeof value === 'object' && typeof value.id === 'string' ? [[value.id, value]] : []))
    const result = next.map((value, i) => shareProjectData(
      value && typeof value === 'object' && typeof value.id === 'string' ? byId.get(value.id) : previous[i], value))
    return (result.length === previous.length && result.every((value, i) => value === previous[i]) ? previous : result) as T
  }
  if (Array.isArray(previous) || Array.isArray(next)) return next
  const before = previous as Record<string, unknown>, after = next as Record<string, unknown>
  const a = Object.keys(before), b = Object.keys(after)
  let equal = a.length === b.length && a.every((key, i) => key === b[i])
  const entries = b.map(key => {
    const value = shareProjectData(before[key], after[key])
    if (value !== before[key]) equal = false
    return [key, value]
  })
  return (equal ? previous : Object.fromEntries(entries)) as T
}
