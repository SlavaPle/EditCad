import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import type { FaceConstraint, FaceConstraintType } from '../face-constraints/model'
import { captureFrozenPlanePairFromTriangles } from '../model-selection/frozenPlanePairCapture'

export type CreateCustomSizeConstraintResult =
  | {
      ok: true
      constraint: FaceConstraint
      modelElements: PreparedModelElement[]
      gapMm: number
    }
  | { ok: false; error: 'needTwoPlanes' | 'invalidTarget' }

/**
 * Tworzy elementary FaceConstraint między dwiema łatami (+ modelElements) z displayName.
 */
export function createCustomSizeConstraint(params: {
  geometry: BufferGeometry
  existingElements: readonly PreparedModelElement[]
  mergedFaceIndices: readonly number[]
  targetMm: number
  displayName?: string
  type?: Extract<FaceConstraintType, 'const' | 'minmax' | 'min' | 'max'>
}): CreateCustomSizeConstraintResult {
  const analysis = analyzeTwoFaceStretch(params.geometry, [...params.mergedFaceIndices])
  if (!analysis.ok) return { ok: false, error: 'needTwoPlanes' }
  if (!Number.isFinite(params.targetMm) || params.targetMm <= 0) {
    return { ok: false, error: 'invalidTarget' }
  }

  const captured = captureFrozenPlanePairFromTriangles(
    params.geometry,
    [...params.mergedFaceIndices],
    { idPrefix: 'size', slotTag: 'custom' },
  )
  if (!captured.ok) return { ok: false, error: 'needTwoPlanes' }

  const type = params.type ?? 'minmax'
  const id = `size-${Date.now().toString(36)}`
  const name = params.displayName?.trim() || undefined
  const elA = captured.elements.find((e) => e.id === captured.elementAId)
  const elB = captured.elements.find((e) => e.id === captured.elementBId)
  const base = {
    id,
    facePair: {
      a: elA?.faceIndices[0] ?? 0,
      b: elB?.faceIndices[0] ?? 0,
    },
    elementAId: captured.elementAId,
    elementBId: captured.elementBId,
    displayName: name,
  }

  let constraint: FaceConstraint
  if (type === 'const') {
    constraint = { ...base, type: 'const', valueMm: params.targetMm }
  } else if (type === 'min') {
    constraint = { ...base, type: 'min', valueMm: params.targetMm }
  } else if (type === 'max') {
    constraint = { ...base, type: 'max', valueMm: params.targetMm }
  } else {
    constraint = {
      ...base,
      type: 'minmax',
      minMm: 0,
      maxMm: Math.max(params.targetMm, analysis.gapMm),
    }
  }

  const byId = new Map(params.existingElements.map((e) => [e.id, e]))
  for (const el of captured.elements) {
    byId.set(el.id, el)
  }

  return {
    ok: true,
    constraint,
    modelElements: [...byId.values()],
    gapMm: analysis.gapMm,
  }
}
