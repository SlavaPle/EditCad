import { evaluateBlockConstraint } from './evaluateBlockConstraint'
import { evaluateMinConstraint } from './evaluateMinConstraint'
import { evaluateMaxConstraint } from './evaluateMaxConstraint'
import { evaluateConstConstraint } from './evaluateConstConstraint'
import { evaluateProfilConstraint } from './evaluateProfilConstraint'
import { evaluatePanelConstraint } from './evaluatePanelConstraint'
export type { StretchConstraintEvalContext } from './stretchEvalTypes'
export { resolveTriangleIndicesForConstraint } from './resolveConstraintFaces'
export { measureConstraintPairGapMm } from './measurePairGapMm'
export { measureEdgeLengthMm } from './measureEdgeLengthMm'
export { mergedFacesMatchProfilElementPair } from './matchesProfilEditTarget'

export {
  evaluateBlockConstraint,
  evaluateMinConstraint,
  evaluateMaxConstraint,
  evaluateConstConstraint,
  evaluateProfilConstraint,
  evaluatePanelConstraint,
}
export { runConstraintEvaluationForStretch } from './runConstraintEvaluationForStretch'

/** Właściwość mapująca typ ograniczenia na dedykowaną funkcję oceny (po symulowanym rozciągnięciu). */
export const partConstraintEvaluators = {
  evaluateBlockConstraint,
  evaluateMinConstraint,
  evaluateMaxConstraint,
  evaluateConstConstraint,
  evaluateProfilConstraint,
  evaluatePanelConstraint,
} as const
