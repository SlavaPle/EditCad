import type { BufferGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import {
  applyTargetDistanceFromInput,
  type ApplyTwoFaceStretchFn,
} from '../../lib/applyTargetDistanceFromInput'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchValidation'
import type { TwoFaceStretchError } from '../../lib/twoFaceStretch'
import type { StretchBasicEnvelope } from '../part-constraints/stretchBasicEnvelopeForMergedPair'
import { validateDimensionGapInput, type DimensionGapInputError } from './validateDimensionGapInput'

export type ApplyDimensionGapFromInputParams = {
  inputText: string
  geometry: BufferGeometry | null
  mergedFaces: readonly number[] | null
  faceConstraints: readonly FaceConstraint[]
  modelElements: readonly PreparedModelElement[]
}

export type ApplyDimensionGapFromInputResult =
  | { ok: true; geometry: BufferGeometry; effectiveTargetMm: number }
  | {
      ok: false
      error:
        | DimensionGapInputError
        | 'invalidGeometry'
        | TwoFaceStretchError
        | PreparedStretchPrecheckError
      envelope: StretchBasicEnvelope | null
    }

/** Walidacja + ta sama ścieżka apply co prawy panel (rejectClampedTarget). */
export function applyDimensionGapFromInput(
  params: ApplyDimensionGapFromInputParams,
  onApply: ApplyTwoFaceStretchFn,
): ApplyDimensionGapFromInputResult {
  const validated = validateDimensionGapInput(params)
  if (!validated.ok) return validated

  const faces = params.mergedFaces
  if (!faces || faces.length < 2) {
    return { ok: false, error: 'invalidGeometry', envelope: null }
  }

  const applied = applyTargetDistanceFromInput(params.inputText, onApply, {
    mergedFaces: [...faces],
  })
  if (!applied.ok) return { ok: false, error: applied.error, envelope: null }
  return applied
}
