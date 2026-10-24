import type { FaceConstraintType } from '../face-constraints/model'

/** Payload Apply z inline panelu rozmiaru w drzewie. */
export type SizeEditApplyPayload = {
  valueMm: number
  limitType: FaceConstraintType | 'free'
  minMm?: number
  maxMm?: number
}
