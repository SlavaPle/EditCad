import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import type { FaceConstraint } from '../face-constraints/model'
import { mergedFacesMatchConstraintStretchPair } from './matchesConstraintStretchPair'

/** Tolerancja porównania po przeliczeniu zaznaczonego celu (mm). */
const EPS_ADJUST = 1e-4

/** Minimalny sensowny zamos (jak w analyzeTwoFaceStretch / twoFaceStretch). */
const MIN_STRETCH_GAP_FLOOR_MM = 1e-4

/** Przy włączonej blokadzie — MIN/MAX/CONST na aktualnej parze (CONST = valueMm dla płaszczyzn). */
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

  const an = analyzeTwoFaceStretch(geometry, mergedFaces)
  if (!an.ok) return { targetMm: rawTargetMm, adjusted: false }

  const elems = modelElements ?? []
  let lower = MIN_STRETCH_GAP_FLOOR_MM
  let upper = Number.POSITIVE_INFINITY
  let constFacePairTargetMm: number | null = null

  for (const c of faceConstraints) {
    if (c.type !== 'min' && c.type !== 'max' && c.type !== 'const') continue
    if (!mergedFacesMatchConstraintStretchPair(geometry, mergedFaces, elems, c)) continue

    if (c.type === 'const') {
      if (c.edgeVertexPair) continue
      constFacePairTargetMm = c.valueMm
      continue
    }
    if (c.type === 'min') lower = Math.max(lower, c.valueMm)
    if (c.type === 'max') upper = Math.min(upper, c.valueMm)
  }

  if (
    constFacePairTargetMm === null &&
    upper < Number.POSITIVE_INFINITY &&
    lower > upper + EPS_ADJUST
  ) {
    return { targetMm: rawTargetMm, adjusted: false }
  }

  if (constFacePairTargetMm !== null) {
    const t = constFacePairTargetMm
    const adjusted = Math.abs(t - rawTargetMm) > EPS_ADJUST
    return { targetMm: t, adjusted }
  }

  let t = rawTargetMm
  if (t < lower) t = lower
  if (upper < Number.POSITIVE_INFINITY && t > upper) t = upper
  const adjusted = Math.abs(t - rawTargetMm) > EPS_ADJUST

  if (!Number.isFinite(t) || t <= 0 || (upper < Number.POSITIVE_INFINITY && lower > upper + EPS_ADJUST)) {
    return { targetMm: rawTargetMm, adjusted: false }
  }

  return { targetMm: t, adjusted }
}
