import type { FaceConstraint } from '../features/face-constraints/model'
import type { PreparedModelElement } from './preparedElementFormat'

export type ApplyTwoFaceStretchOverlay = {
  mergedFaces?: readonly number[]
  faceConstraints?: FaceConstraint[]
  modelElements?: PreparedModelElement[]
  forceConstraintEvaluation?: boolean
  panelThicknessMergedFaces?: readonly number[]
  /** Distance-between-faces: do not snap target to nearest allowed mm — fail instead. */
  rejectClampedTarget?: boolean
}
