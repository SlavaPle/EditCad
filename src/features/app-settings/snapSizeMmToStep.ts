/**
 * Wyrównanie wartości / zakresów suwaka do kroku ustawień (mm).
 */

export function snapSizeMmToStep(valueMm: number, stepMm: number): number {
  if (!Number.isFinite(valueMm)) return valueMm
  const step = Number.isFinite(stepMm) && stepMm > 0 ? stepMm : 1
  const snapped = Math.round(valueMm / step) * step
  // Usuń szum float (np. 10.0000000002)
  const cleaned = Math.round(snapped / step) * step
  return Math.round(cleaned * 1e9) / 1e9
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
