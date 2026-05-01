import type { ConstFaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import { measureConstraintPairGapMm } from './measurePairGapMm'
import { measureEdgeLengthMm } from './measureEdgeLengthMm'

const EPS = 1e-3

/**
 * CONST — wymiar nie może się zmienić (sprawdzamy do↔po, niezależnie od wybranej przez użytkownika pary przy rozciąganiu).
 */
export function evaluateConstConstraint(
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
