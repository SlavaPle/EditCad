/** Parsuje dodatnią liczbę mm z pola tekstowego (przecinek jako separator dziesiętny). */
export function parsePositiveMm(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim()
  if (normalized === '') return null
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Pusta wartość → 0; w przeciwnym razie liczba ≥ 0 mm (dolna granica zakresu). */
export function parseNonNegativeMmWithDefaultZero(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim()
  if (normalized === '') return 0
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}
