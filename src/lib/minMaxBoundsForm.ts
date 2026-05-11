import { parsePositiveMm } from './parsePositiveMm'

/** Powód odrzucenia pól MIN/MAX z formularza (checkbox + dwa inputy). */
export type MinMaxBoundsFormFailureReason = 'invalidMax' | 'invalidMinWhenEnabled' | 'invalidRange'

export type ParseMinMaxBoundsFormResult =
  | { ok: true; minMm: number; maxMm: number }
  | { ok: false; reason: MinMaxBoundsFormFailureReason }

/**
 * Logika prawa/lewa panelu: bez MIN (checkbox wył.) → minMm = 0;
 * z MIN → wartość musi być dodatnia (parsePositiveMm).
 */
export function parseMinMaxBoundsForm(params: {
  useMinBound: boolean
  minMmInput: string
  maxMmInput: string
}): ParseMinMaxBoundsFormResult {
  const maxMm = parsePositiveMm(params.maxMmInput)
  if (maxMm === null) {
    return { ok: false, reason: 'invalidMax' }
  }
  let minMm = 0
  if (params.useMinBound) {
    const parsedMin = parsePositiveMm(params.minMmInput)
    if (parsedMin === null) {
      return { ok: false, reason: 'invalidMinWhenEnabled' }
    }
    minMm = parsedMin
  }
  if (minMm > maxMm + 1e-9) {
    return { ok: false, reason: 'invalidRange' }
  }
  return { ok: true, minMm, maxMm }
}
