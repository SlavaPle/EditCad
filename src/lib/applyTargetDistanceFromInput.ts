import type { BufferGeometry } from 'three'
import type { ApplyTwoFaceStretchOverlay } from './applyStretchOverlay'
import type { PreparedStretchPrecheckError } from './preparedStretchValidation'
import { parsePositiveMm } from './parsePositiveMm'
import type { TwoFaceStretchError } from './twoFaceStretch'

export type ApplyTwoFaceStretchFn = (
  targetMm: number,
  overlay?: ApplyTwoFaceStretchOverlay,
) =>
  | { ok: true; geometry: BufferGeometry; effectiveTargetMm: number }
  | { ok: false; error: TwoFaceStretchError | PreparedStretchPrecheckError }

/** Ta sama ścieżka co przycisk Apply / Enter przy „Target distance” na prawym panelu. */
export function applyTargetDistanceFromInput(
  inputText: string,
  onApplyTwoFaceStretch: ApplyTwoFaceStretchFn,
  overlay?: Omit<ApplyTwoFaceStretchOverlay, 'rejectClampedTarget'>,
):
  | { ok: true; geometry: BufferGeometry; effectiveTargetMm: number }
  | {
      ok: false
      error: 'invalidTarget' | TwoFaceStretchError | PreparedStretchPrecheckError
    } {
  const mm = parsePositiveMm(inputText)
  if (mm === null) return { ok: false, error: 'invalidTarget' }
  return onApplyTwoFaceStretch(mm, { ...overlay, rejectClampedTarget: true })
}
