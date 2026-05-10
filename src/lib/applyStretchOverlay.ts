import type { FaceConstraint } from '../features/face-constraints/model'
import type { PreparedModelElement } from './preparedElementFormat'

export type ApplyTwoFaceStretchOverlay = {
  mergedFaces?: readonly number[]
  faceConstraints?: FaceConstraint[]
  modelElements?: readonly PreparedModelElement[]
  forceConstraintEvaluation?: boolean
}
