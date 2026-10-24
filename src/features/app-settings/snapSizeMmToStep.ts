/**
 * Wyrównanie wartości / zakresów suwaka do kroku ustawień (mm).
 */

/** Usuń szum float po stretch / bbox (bez zmiany siatki kroku UI). */
export function cleanSizeMmFloat(valueMm: number, decimals = 6): number {
  if (!Number.isFinite(valueMm)) return valueMm
  const f = 10 ** Math.max(0, Math.min(12, Math.floor(decimals)))
  return Math.round(valueMm * f) / f
}

export function snapSizeMmToStep(valueMm: number, stepMm: number): number {
  if (!Number.isFinite(valueMm)) return valueMm
  const step = Number.isFinite(stepMm) && stepMm > 0 ? stepMm : 1
  const snapped = Math.round(valueMm / step) * step
  // Usuń szum float (np. 10.0000000002)
  const cleaned = Math.round(snapped / step) * step
  return cleanSizeMmFloat(cleaned, 9)
}

/** Wartość do UI / sizeMm w drzewie: czyść float, potem siatka kroku względem rozmiaru. */
export function sizeMmForUi(
  valueMm: number,
  resolveStep: (sizeMm: number) => number,
): number {
  if (!Number.isFinite(valueMm)) return valueMm
  const cleaned = cleanSizeMmFloat(valueMm)
  return snapSizeMmToStep(cleaned, resolveStep(cleaned))
}

/** Tekst pola mm bez „100.0000000002”. */
export function formatSizeMmInput(valueMm: number): string {
  if (!Number.isFinite(valueMm)) return ''
  const cleaned = cleanSizeMmFloat(valueMm)
  if (Number.isInteger(cleaned)) return String(cleaned)
  return String(cleaned)
}

/** Min/max suwaka na siatce kroku (min ≥ step, bo rozmiar > 0). */
export function alignSizeSliderBounds(
  minMm: number,
  maxMm: number,
  stepMm: number,
): { min: number; max: number } {
  const step = Number.isFinite(stepMm) && stepMm > 0 ? stepMm : 1
  let min = snapSizeMmToStep(Math.floor(minMm / step) * step, step)
  let max = snapSizeMmToStep(Math.ceil(maxMm / step) * step, step)
  if (!(min > 0)) min = step
  if (!(max > min)) max = min + step
  return { min, max }
}
