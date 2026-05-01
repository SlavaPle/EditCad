import type { FaceConstraint } from './model'
import { validateFaceConstraint } from './model'

function samePair(a: FaceConstraint['facePair'], b: FaceConstraint['facePair']): boolean {
  if (a === null || b === null) return a === b
  return (a.a === b.a && a.b === b.b) || (a.a === b.b && a.b === b.a)
}

function sameElementBinding(a: FaceConstraint, b: FaceConstraint): boolean {
  const ae = a.elementAId?.trim() && a.elementBId?.trim()
  const be = b.elementAId?.trim() && b.elementBId?.trim()
  if (!ae || !be) return false
  return (
    (a.elementAId === b.elementAId && a.elementBId === b.elementBId) ||
    (a.elementAId === b.elementBId && a.elementBId === b.elementAId)
  )
}

function sameConstBinding(a: FaceConstraint, b: FaceConstraint): boolean {
  if (a.type !== 'const' || b.type !== 'const') return false
  const ae = a.edgeVertexPair
  const be = b.edgeVertexPair
  if (ae && be) {
    return (ae.va === be.va && ae.vb === be.vb) || (ae.va === be.vb && ae.vb === be.va)
  }
  if (ae ?? be) return false
  return samePair(a.facePair, b.facePair) || sameElementBinding(a, b)
}

function matchesUpsertSlot(item: FaceConstraint, next: FaceConstraint): boolean {
  if (item.type !== next.type) return false
  switch (next.type) {
    case 'const':
      return sameConstBinding(item, next)
    case 'block':
    case 'panel':
      return true
    default:
      return samePair(item.facePair, next.facePair) || sameElementBinding(item, next)
  }
}

export function upsertFaceConstraint(
  list: readonly FaceConstraint[],
  next: FaceConstraint,
): FaceConstraint[] {
  if (!validateFaceConstraint(next)) return [...list]
  const idx = list.findIndex((item) => matchesUpsertSlot(item, next))
  if (idx < 0) {
    return [...list, next]
  }
  return list.map((item, i) => (i === idx ? next : item))
}

export function removeFaceConstraint(list: readonly FaceConstraint[], id: string): FaceConstraint[] {
  return list.filter((item) => item.id !== id)
}
