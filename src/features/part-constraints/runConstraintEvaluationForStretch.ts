/**
 * Dispatcher: jedna funkcja dla każdego z 6 typów — wywoływane przez typ dystrybutora.
 */
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import type { FaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import { evaluateBlockConstraint } from './evaluateBlockConstraint'
import { evaluateMinConstraint } from './evaluateMinConstraint'
import { evaluateMaxConstraint } from './evaluateMaxConstraint'
import { evaluateConstConstraint } from './evaluateConstConstraint'
import { evaluateProfilConstraint } from './evaluateProfilConstraint'
import { evaluatePanelConstraint } from './evaluatePanelConstraint'

export function runConstraintEvaluationForStretch(
  ctx: StretchConstraintEvalContext,
  c: FaceConstraint,
): PreparedStretchPrecheckError | null {
  switch (c.type) {
    case 'block':
      return evaluateBlockConstraint(c)
    case 'min':
      return evaluateMinConstraint(ctx, c)
    case 'max':
      return evaluateMaxConstraint(ctx, c)
    case 'const':
      return evaluateConstConstraint(ctx, c)
    case 'profil':
      return evaluateProfilConstraint(ctx, c)
    case 'panel':
      return evaluatePanelConstraint(ctx, c)
    default: {
      const _exhaust: never = c
      void _exhaust
      return null
    }
  }
}
