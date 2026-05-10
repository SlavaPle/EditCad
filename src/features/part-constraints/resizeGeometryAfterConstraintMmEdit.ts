import type { BufferGeometry } from 'three'
import type { PreparedElementConstraints, PreparedModelElement } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch, applyTwoFaceStretch } from '../../lib/twoFaceStretch'
import type { FaceConstraint, ProfilFaceConstraint } from '../face-constraints/model'
import { clampStretchTargetMmForBasicConstraints } from './clampStretchTargetForBasicConstraints'
import { partitionSelectionIntoCoplanarPatches } from '../model-selection/facePlaneSelection'
import { mergedFacesMatchConstraintStretchPair } from './matchesConstraintStretchPair'
import { mergedFacesMatchProfilElementPair } from './matchesProfilEditTarget'
import {
  MIN_STRETCH_GAP_FLOOR_MM,
  stretchBasicEnvelopeForMergedPair,
} from './stretchBasicEnvelopeForMergedPair'
import { resolveTriangleIndicesForConstraint } from './resolveConstraintFaces'
import { validatePreparedStretchPrecheck } from '../../lib/preparedStretchValidation'

const EPS = 1e-3

/** Czy PROFIL — para rozciągania pokrywa się ze scalonym zaznaczeniem trójkątów. */
function profilStretchPairMatchesMergedFaces(
  geometry: BufferGeometry,
  mergedFaces: readonly number[],
  c: ProfilFaceConstraint,
  elements: readonly PreparedModelElement[],
): boolean {
  const ea = c.elementAId?.trim()
  const eb = c.elementBId?.trim()
  if (ea && eb && elements.length > 0) {
    return mergedFacesMatchProfilElementPair(geometry, mergedFaces, elements, ea, eb)
  }
  if (c.facePair) {
    const patches = partitionSelectionIntoCoplanarPatches(geometry, mergedFaces)
    if (patches.length !== 2) return false
    const sa = new Set(patches[0]!)
    const sb = new Set(patches[1]!)
    return (
      (sa.has(c.facePair.a) && sb.has(c.facePair.b)) ||
      (sa.has(c.facePair.b) && sb.has(c.facePair.a))
    )
  }
  return false
}

/**
 * Docelowy zazór dla edytowanego ograniczenia MIN/MAX/CONST (bez edge) lub PROFIL na tej samej parze.
 */
function desiredGapMmForEditedConstraint(params: {
  geometry: BufferGeometry
  mergedFaces: readonly number[]
  allConstraints: readonly FaceConstraint[]
  modelElements: readonly PreparedModelElement[] | undefined
  edited: FaceConstraint
  currentGapMm: number
}): number | null {
  const { geometry, mergedFaces, allConstraints, modelElements, edited, currentGapMm } = params
  const elems = modelElements ?? []

  if (edited.type === 'profil') {
    if (!profilStretchPairMatchesMergedFaces(geometry, mergedFaces, edited, elems)) return null
    const lower =
      typeof edited.stretchMinMm === 'number' &&
      Number.isFinite(edited.stretchMinMm) &&
      edited.stretchMinMm > 0
        ? edited.stretchMinMm
        : MIN_STRETCH_GAP_FLOOR_MM
    const upper = edited.valueMm
    if (lower > upper + EPS) return null
    let t = currentGapMm
    if (t < lower) t = lower
    if (t > upper) t = upper
    return t
  }

  if (edited.type !== 'min' && edited.type !== 'max' && edited.type !== 'const') {
    return null
  }
  if (edited.type === 'const' && edited.edgeVertexPair) return null
  if (!mergedFacesMatchConstraintStretchPair(geometry, mergedFaces, elems, edited)) {
    return null
  }

  const env = stretchBasicEnvelopeForMergedPair(geometry, mergedFaces, allConstraints, modelElements)
  if (!env) return null

  if (env.pinConstMm !== null) return env.pinConstMm

  let t = currentGapMm
  if (t < env.lower) t = env.lower
  if (env.upper < Number.POSITIVE_INFINITY && t > env.upper) t = env.upper
  return t
}

export type ResizeGeometryAfterConstraintMmEditResult =
  | { gapAdjusted: false }
  | { gapAdjusted: true; geometry: BufferGeometry }

/**
 * Po zapisie wartości mm w limicie: jeśli aktualny zazór pary trzeba dopasować (MIN/MAX/CONST/PROFIL),
 * jedno rozciągnięcie „two face” z walidacją jak przy ręcznym Apply.
 *
 * PANEL (grubość / AABB), BLOCK, CONST na krawędzi — bez zmiany geometrii w tej ścieżce.
 */
export function resizeGeometryAfterConstraintMmEdit(params: {
  geometry: BufferGeometry
  editedConstraint: FaceConstraint
  allConstraints: readonly FaceConstraint[]
  prepared: PreparedElementConstraints
}): ResizeGeometryAfterConstraintMmEditResult {
  const { geometry, editedConstraint, allConstraints, prepared } = params
  const elements = prepared.modelElements ?? []

  const mergedFaces = resolveTriangleIndicesForConstraint(editedConstraint, elements)
  if (!mergedFaces || mergedFaces.length === 0) {
    return { gapAdjusted: false }
  }

  const an = analyzeTwoFaceStretch(geometry, mergedFaces)
  if (!an.ok) return { gapAdjusted: false }

  const rawDesired = desiredGapMmForEditedConstraint({
    geometry,
    mergedFaces,
    allConstraints,
    modelElements: elements,
    edited: editedConstraint,
    currentGapMm: an.gapMm,
  })
  if (rawDesired === null) return { gapAdjusted: false }

  const { targetMm } = clampStretchTargetMmForBasicConstraints({
    geometry,
    mergedFaces,
    rawTargetMm: rawDesired,
    faceConstraints: allConstraints,
    modelElements: elements,
    constraintsLocked: true,
  })

  if (!Number.isFinite(targetMm) || targetMm <= 0) {
    return { gapAdjusted: false }
  }

  if (Math.abs(targetMm - an.gapMm) <= EPS) {
    return { gapAdjusted: false }
  }

  const pre = validatePreparedStretchPrecheck({
    model: geometry,
    mergedFaces,
    targetMm,
    prepared,
    constraintsLocked: true,
  })
  if (!pre.ok) {
    return { gapAdjusted: false }
  }

  const stretched = applyTwoFaceStretch(geometry, mergedFaces, targetMm)
  if (!stretched.ok) {
    return { gapAdjusted: false }
  }

  return { gapAdjusted: true, geometry: stretched.geometry }
}
