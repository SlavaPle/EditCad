import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import type { FaceConstraint } from '../face-constraints/model'
import { stretchBasicEnvelopeForMergedPair } from './stretchBasicEnvelopeForMergedPair'
import { stretchProfilBandForMergedPair } from './stretchProfilBandForMergedPair'

const EPS_ADJUST = 1e-4

/** Przy włączonej blokadzie — MIN/MAX/CONST na aktualnej parze (CONST = valueMm dla płaszczyzn); PROFIL kliuje pas MIN…MAX przy tej parze rozciągania. */
export function clampStretchTargetMmForBasicConstraints(params: {
  geometry: BufferGeometry
  mergedFaces: readonly number[]
  rawTargetMm: number
  faceConstraints: readonly FaceConstraint[] | undefined
  modelElements: readonly PreparedModelElement[] | undefined
  constraintsLocked: boolean
}): { targetMm: number; adjusted: boolean } {
  const {
    geometry,
    mergedFaces,
    rawTargetMm,
    faceConstraints,
    modelElements,
    constraintsLocked,
  } = params

  if (
    !constraintsLocked ||
    !faceConstraints?.length ||
    !Number.isFinite(rawTargetMm) ||
    rawTargetMm <= 0
  ) {
    return { targetMm: rawTargetMm, adjusted: false }
  }

  const env = stretchBasicEnvelopeForMergedPair(geometry, mergedFaces, faceConstraints, modelElements)
  if (!env) return { targetMm: rawTargetMm, adjusted: false }

  const profBand = stretchProfilBandForMergedPair(geometry, mergedFaces, faceConstraints, modelElements)

  const finalize = (candidate: number): { targetMm: number; adjusted: boolean } => {
    let t = candidate
    if (profBand !== null && env.pinConstMm === null) {
      if (t < profBand.lower) t = profBand.lower
      if (t > profBand.upper) t = profBand.upper
    }
    if (!Number.isFinite(t) || t <= 0) return { targetMm: rawTargetMm, adjusted: false }
    return { targetMm: t, adjusted: Math.abs(t - rawTargetMm) > EPS_ADJUST }
  }

  if (env.matchedConstraintCount === 0) {
    let t = rawTargetMm
    if (t < env.lower) t = env.lower
    if (env.upper < Number.POSITIVE_INFINITY && t > env.upper) t = env.upper
    if (!Number.isFinite(t) || t <= 0) return { targetMm: rawTargetMm, adjusted: false }
    return finalize(t)
  }

  if (env.pinConstMm !== null) {
    const t = env.pinConstMm
    return { targetMm: t, adjusted: Math.abs(t - rawTargetMm) > EPS_ADJUST }
  }

  if (env.upper < Number.POSITIVE_INFINITY && env.lower > env.upper + EPS_ADJUST) {
    return { targetMm: rawTargetMm, adjusted: false }
  }

  let t = rawTargetMm
  if (t < env.lower) t = env.lower
  if (env.upper < Number.POSITIVE_INFINITY && t > env.upper) t = env.upper

  if (!Number.isFinite(t) || t <= 0 || (env.upper < Number.POSITIVE_INFINITY && env.lower > env.upper + EPS_ADJUST)) {
    return { targetMm: rawTargetMm, adjusted: false }
  }

  return finalize(t)
}
