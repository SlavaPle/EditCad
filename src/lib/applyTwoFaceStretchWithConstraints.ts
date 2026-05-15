import type { BufferGeometry } from 'three'
import type { PreparedElementConstraints } from './preparedElementFormat'
import {
  validatePreparedStretchPrecheck,
  type PreparedStretchPrecheckError,
} from './preparedStretchValidation'
import { applyTwoFaceStretch, type TwoFaceStretchError } from './twoFaceStretch'
import type { ApplyTwoFaceStretchOverlay } from './applyStretchOverlay'
import {
  clampStretchTargetMmForBasicConstraints,
  stretchTargetLockedViolationError,
} from '../features/part-constraints/clampStretchTargetForBasicConstraints'
import { stretchBasicEnvelopeForMergedPair } from '../features/part-constraints/stretchBasicEnvelopeForMergedPair'

export type ApplyTwoFaceStretchWithConstraintsParams = {
  geometry: BufferGeometry
  targetMm: number
  mergedFaces: readonly number[]
  prepared: PreparedElementConstraints
  constraintsLocked: boolean
  overlay?: ApplyTwoFaceStretchOverlay
}

export type ApplyTwoFaceStretchWithConstraintsResult =
  | { ok: true; geometry: BufferGeometry; effectiveTargetMm: number }
  | { ok: false; error: TwoFaceStretchError | PreparedStretchPrecheckError }

/** Rozciągnięcie pary ścian z klamrowaniem MIN/MAX/CONST/PROFIL i walidacją ECDPRT. */
export function applyTwoFaceStretchWithConstraints(
  params: ApplyTwoFaceStretchWithConstraintsParams,
): ApplyTwoFaceStretchWithConstraintsResult {
  const { geometry, targetMm, mergedFaces, prepared, constraintsLocked, overlay } = params

  if (mergedFaces.length === 0) {
    return { ok: false, error: 'invalidGeometry' }
  }

  const faceConstraintsEffective = overlay?.faceConstraints ?? prepared.faceConstraints ?? []
  const modelElementsEffective = overlay?.modelElements ?? prepared.modelElements ?? []

  const preparedEffective: PreparedElementConstraints = {
    ...prepared,
    faceConstraints: [...faceConstraintsEffective],
    modelElements: [...modelElementsEffective],
  }

  const constraintsEvalLocked = constraintsLocked || overlay?.forceConstraintEvaluation === true

  const clampResult = clampStretchTargetMmForBasicConstraints({
    geometry,
    mergedFaces,
    rawTargetMm: targetMm,
    faceConstraints: faceConstraintsEffective,
    modelElements: modelElementsEffective,
    constraintsLocked: constraintsEvalLocked,
  })
  const resolvedTargetMm = clampResult.targetMm

  if (overlay?.rejectClampedTarget && constraintsEvalLocked && clampResult.adjusted) {
    const env = stretchBasicEnvelopeForMergedPair(
      geometry,
      mergedFaces,
      faceConstraintsEffective,
      modelElementsEffective,
    )
    const lockedErr = stretchTargetLockedViolationError(targetMm, resolvedTargetMm, env)
    if (lockedErr) {
      return { ok: false, error: lockedErr }
    }
  }

  const pre = validatePreparedStretchPrecheck({
    model: geometry,
    mergedFaces,
    targetMm: resolvedTargetMm,
    prepared: preparedEffective,
    constraintsLocked: constraintsEvalLocked,
    panelThicknessMergedFaces: overlay?.panelThicknessMergedFaces,
  })
  if (!pre.ok) {
    return { ok: false, error: pre.error }
  }

  const result = applyTwoFaceStretch(geometry, mergedFaces, resolvedTargetMm)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  return {
    ok: true,
    geometry: result.geometry,
    effectiveTargetMm: resolvedTargetMm,
  }
}
