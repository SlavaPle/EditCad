import type { PanelAxisBounds } from '../features/face-constraints/model'
import { parseMinMaxBoundsForm, type ParseMinMaxBoundsFormResult } from './minMaxBoundsForm'

/** Granice osi panelu z formularza MIN/MAX (jak MINMAX). */
export function panelAxisBoundsFromMinMaxForm(params: {
  useMinBound: boolean
  minMmInput: string
  maxMmInput: string
}): ParseMinMaxBoundsFormResult {
  return parseMinMaxBoundsForm(params)
}

export function panelAxisBoundsFromParsed(parsed: { minMm: number; maxMm: number }): PanelAxisBounds {
  return parsed.minMm > 1e-9 ? { minMm: parsed.minMm, maxMm: parsed.maxMm } : { maxMm: parsed.maxMm }
}
