import type { ConstFaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import { measureConstraintPairGapMm } from './measurePairGapMm'
import { measureEdgeLengthMm } from './measureEdgeLengthMm'

const EPS = 1e-3

/** PROFIL — syntetyczny CONST: bez zmiany wymiaru przed→po próbie rozciągnięcia. */
export function evaluateConstGeometryInvariant(
  ctx: StretchConstraintEvalContext,
  c: ConstFaceConstraint,
): PreparedStretchPrecheckError | null {
  if (c.edgeVertexPair) {
    const { va, vb } = c.edgeVertexPair
    const beforeLen = measureEdgeLengthMm(ctx.geometryBefore, va, vb)
    const afterLen = measureEdgeLengthMm(ctx.geometryAfter, va, vb)
    if (beforeLen === null || afterLen === null) return null
    return Math.abs(afterLen - beforeLen) <= EPS ? null : 'constraintBrokenConst'
  }

  const beforeGap = measureConstraintPairGapMm(ctx.geometryBefore, c, ctx.elements)
  const afterGap = measureConstraintPairGapMm(ctx.geometryAfter, c, ctx.elements)
  if (beforeGap === null || afterGap === null) return null
  return Math.abs(afterGap - beforeGap) <= EPS ? null : 'constraintBrokenConst'
}

/** CONST użytkownika: wartość w pliku = nominalny zamos / długość krawędzi po edycji. */
export function evaluateConstConstraint(
  ctx: StretchConstraintEvalContext,
  c: ConstFaceConstraint,
): PreparedStretchPrecheckError | null {
  if (c.edgeVertexPair) {
    const { va, vb } = c.edgeVertexPair
    const afterLen = measureEdgeLengthMm(ctx.geometryAfter, va, vb)
    if (afterLen === null) return null
    return Math.abs(afterLen - c.valueMm) <= EPS ? null : 'constraintBrokenConst'
  }

  const afterGap = measureConstraintPairGapMm(ctx.geometryAfter, c, ctx.elements)
  if (afterGap === null) return null
  return Math.abs(afterGap - c.valueMm) <= EPS ? null : 'constraintBrokenConst'
}
