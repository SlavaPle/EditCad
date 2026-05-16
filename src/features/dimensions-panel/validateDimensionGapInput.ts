import type { BufferGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { parsePositiveMm } from '../../lib/parsePositiveMm'
import {
  stretchBasicEnvelopeForMergedPair,
  stretchInputDeviationKind,
  type StretchBasicEnvelope,
} from '../part-constraints/stretchBasicEnvelopeForMergedPair'

export type DimensionGapInputError = 'invalidTarget' | 'belowMin' | 'aboveMax' | 'constMismatch'

export type ValidateDimensionGapInputParams = {
  inputText: string
  geometry: BufferGeometry | null
  mergedFaces: readonly number[] | null
  faceConstraints: readonly FaceConstraint[]
  modelElements: readonly PreparedModelElement[]
}

export type ValidateDimensionGapInputResult =
  | { ok: true; mm: number; envelope: StretchBasicEnvelope | null }
  | { ok: false; error: DimensionGapInputError; envelope: StretchBasicEnvelope | null }

/** Walidacja pola odstępu mm (Enter / blur) przed apply stretch. */
export function validateDimensionGapInput(
  params: ValidateDimensionGapInputParams,
): ValidateDimensionGapInputResult {
  const mm = parsePositiveMm(params.inputText)
  if (mm === null) return { ok: false, error: 'invalidTarget', envelope: null }

  const faces = params.mergedFaces
  if (!params.geometry || !faces || faces.length < 2) {
    return { ok: true, mm, envelope: null }
  }

  const envelope = stretchBasicEnvelopeForMergedPair(
    params.geometry,
    faces,
    params.faceConstraints,
    params.modelElements,
  )
  if (!envelope) return { ok: true, mm, envelope: null }

  const kind = stretchInputDeviationKind(mm, envelope)
  if (kind !== null) return { ok: false, error: kind, envelope }

  return { ok: true, mm, envelope }
}
