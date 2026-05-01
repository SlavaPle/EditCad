import type { MinFaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import { measureConstraintPairGapMm } from './measurePairGapMm'

const EPS = 1e-3

/**
 * MIN — odległość między grupami nie może być mniejsza niż wartość (sprawdzamy geometrię po edycji).
 */
export function evaluateMinConstraint(
  ctx: StretchConstraintEvalContext,
  c: MinFaceConstraint,
): PreparedStretchPrecheckError | null {
  const gap = measureConstraintPairGapMm(ctx.geometryAfter, c, ctx.elements)
  if (gap === null) return null
  return gap + EPS >= c.valueMm ? null : 'constraintBrokenMin'
}
