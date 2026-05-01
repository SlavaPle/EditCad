import type { MaxFaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import { measureConstraintPairGapMm } from './measurePairGapMm'

const EPS = 1e-3

/**
 * MAX — odległość między grupami nie może przekraczać wartości (po edycji).
 */
export function evaluateMaxConstraint(
  ctx: StretchConstraintEvalContext,
  c: MaxFaceConstraint,
): PreparedStretchPrecheckError | null {
  const gap = measureConstraintPairGapMm(ctx.geometryAfter, c, ctx.elements)
  if (gap === null) return null
  return gap <= c.valueMm + EPS ? null : 'constraintBrokenMax'
}
