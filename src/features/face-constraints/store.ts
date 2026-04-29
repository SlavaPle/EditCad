import type { FaceConstraint } from './model'
import { validateFaceConstraint } from './model'

function samePair(a: FaceConstraint['facePair'], b: FaceConstraint['facePair']): boolean {
  if (a === null || b === null) return a === b
  return (a.a === b.a && a.b === b.b) || (a.a === b.b && a.b === b.a)
}

export function upsertFaceConstraint(
  list: readonly FaceConstraint[],
  next: FaceConstraint,
): FaceConstraint[] {
  if (!validateFaceConstraint(next)) return [...list]
  const idx = list.findIndex((item) => item.type === next.type && samePair(item.facePair, next.facePair))
  if (idx < 0) {
    return [...list, next]
  }
  return list.map((item, i) => (i === idx ? next : item))
}

export function removeFaceConstraint(list: readonly FaceConstraint[], id: string): FaceConstraint[] {
  return list.filter((item) => item.id !== id)
}
