/**
 * Walidacja rozciągnięcia względem ograniczeń ECDPRT (symulacja na klonie geometrii).
 */
import type { BufferGeometry } from 'three'
import type { PreparedElementConstraints } from './preparedElementFormat'
import { applyTwoFaceStretch, type TwoFaceStretchError } from './twoFaceStretch'
import { runConstraintEvaluationForStretch } from '../features/part-constraints/runConstraintEvaluationForStretch'
import type { StretchConstraintEvalContext } from '../features/part-constraints/stretchEvalTypes'
import type { PreparedStretchPrecheckError } from './preparedStretchPrecheckErrors'

export type { PreparedStretchPrecheckError } from './preparedStretchPrecheckErrors'

export function validatePreparedStretchPrecheck(params: {
  model: BufferGeometry
  mergedFaces: readonly number[]
  targetMm: number
  prepared: PreparedElementConstraints
  constraintsLocked: boolean
}): { ok: true } | { ok: false; error: PreparedStretchPrecheckError } {
  const { model, mergedFaces, targetMm, prepared, constraintsLocked } = params

  if (!constraintsLocked) {
    return { ok: true }
  }

  const list = prepared.faceConstraints ?? []
  if (list.some((c) => c.type === 'block')) {
    return { ok: false, error: 'lockedByBlock' }
  }

  const cloned = model.clone()
  const stretched = applyTwoFaceStretch(cloned, mergedFaces, targetMm)
  if (!stretched.ok) {
    return { ok: false, error: stretched.error as TwoFaceStretchError }
  }

  const newGeo = stretched.geometry
  const elements = prepared.modelElements ?? []

  const ctx: StretchConstraintEvalContext = {
    geometryBefore: model,
    geometryAfter: newGeo,
    mergedFacesForEdit: mergedFaces,
    elements,
  }

  for (const c of list) {
    if (c.type === 'block') continue
    const err = runConstraintEvaluationForStretch(ctx, c)
    if (err) return { ok: false, error: err }
  }

  return { ok: true }
}
