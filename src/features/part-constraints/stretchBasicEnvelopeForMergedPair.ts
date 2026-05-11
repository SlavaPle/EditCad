import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import type { FaceConstraint } from '../face-constraints/model'
import { mergedFacesMatchConstraintStretchPair } from './matchesConstraintStretchPair'

export const MIN_STRETCH_GAP_FLOOR_MM = 1e-4

const EPS_BOUND = 1e-4

export type StretchBasicEnvelope = {
  /** ≥1 przy trafieniu MIN / MAX lub CONST bez edgeVertexPair. */
  matchedConstraintCount: number
  pinConstMm: number | null
  lower: number
  upper: number
}

/** Zbornik bandy MIN / MAX oraz pin CONST na parze rozciągania. */
export function stretchBasicEnvelopeForMergedPair(
  geometry: BufferGeometry,
  mergedFaces: readonly number[],
  faceConstraints: readonly FaceConstraint[] | undefined,
  modelElements: readonly PreparedModelElement[] | undefined,
): StretchBasicEnvelope | null {
  const an = analyzeTwoFaceStretch(geometry, mergedFaces)
  if (!an.ok) return null

  const elems = modelElements ?? []
  let matchedConstraintCount = 0
  let lower = MIN_STRETCH_GAP_FLOOR_MM
  let upper = Number.POSITIVE_INFINITY
  let pinConstMm: number | null = null

  if (!faceConstraints?.length) {
    return { matchedConstraintCount: 0, pinConstMm: null, lower, upper }
  }

  for (const c of faceConstraints) {
    if (c.type !== 'min' && c.type !== 'max' && c.type !== 'minmax' && c.type !== 'const') continue
    if (!mergedFacesMatchConstraintStretchPair(geometry, mergedFaces, elems, c)) continue
    if (c.type === 'const' && c.edgeVertexPair) continue

    matchedConstraintCount += 1
    if (c.type === 'const') {
      pinConstMm = c.valueMm
      continue
    }
    if (c.type === 'minmax') {
      lower = Math.max(lower, c.minMm)
      upper = Math.min(upper, c.maxMm)
      continue
    }
    if (c.type === 'min') lower = Math.max(lower, c.valueMm)
    if (c.type === 'max') upper = Math.min(upper, c.valueMm)
  }

  return { matchedConstraintCount, pinConstMm, lower, upper }
}

/**
 * Kontrola pola „Target mm” przy włączonych dopasowanych MIN/MAX/CONST.
 * Nie zwraca odchylenia, gdy `matchedConstraintCount === 0`.
 */
export function stretchInputDeviationKind(
  mm: number,
  env: StretchBasicEnvelope,
): 'belowMin' | 'aboveMax' | 'constMismatch' | null {
  if (env.matchedConstraintCount === 0) return null
  if (env.pinConstMm !== null) {
    return Math.abs(mm - env.pinConstMm) > EPS_BOUND ? 'constMismatch' : null
  }
  if (env.upper < Number.POSITIVE_INFINITY && mm > env.upper + EPS_BOUND) return 'aboveMax'
  if (mm < env.lower - EPS_BOUND) return 'belowMin'
  return null
}
