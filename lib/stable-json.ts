/** Deterministic JSON for hashing signed payloads (sorted object keys). */
export function stableStringify(value: unknown): string {
  if (value === undefined) {
    return 'null'
  }
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
  return '{' + pairs.join(',') + '}'
}
