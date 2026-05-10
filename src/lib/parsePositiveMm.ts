/** Parsuje dodatnią liczbę mm z pola tekstowego (przecinek jako separator dziesiętny). */
export function parsePositiveMm(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim()
  if (normalized === '') return null
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}
