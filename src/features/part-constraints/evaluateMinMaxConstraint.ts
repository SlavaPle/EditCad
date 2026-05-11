import type { MinMaxFaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import { measureConstraintPairGapMm } from './measurePairGapMm'

const EPS = 1e-3

/** MIN+MAX na tej samej parze — zawór [minMm, maxMm] (minMm może być 0). */
export function evaluateMinMaxConstraint(
  ctx: StretchConstraintEvalContext,
  c: MinMaxFaceConstraint,
): PreparedStretchPrecheckError | null {
  const gap = measureConstraintPairGapMm(ctx.geometryAfter, c, ctx.elements)
  if (gap === null) return null
  if (gap + EPS < c.minMm) return 'constraintBrokenMin'
  if (gap > c.maxMm + EPS) return 'constraintBrokenMax'
  return null
}
