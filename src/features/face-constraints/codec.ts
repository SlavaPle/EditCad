import type { FaceConstraint } from './model'
import { parseFaceConstraintList } from './model'

export function parseFaceConstraintsForPreparedFile(value: unknown): FaceConstraint[] | null {
  if (value === undefined) return []
  return parseFaceConstraintList(value)
}

export function serializeFaceConstraintsForPreparedFile(value: readonly FaceConstraint[]): FaceConstraint[] {
  return [...value]
}
