import type { PreparedModelElement } from '../../lib/preparedElementFormat'

export function mergeTrianglesForPreparedElementPair(
  elements: readonly PreparedModelElement[],
  elementAId: string,
  elementBId: string,
): number[] | null {
  const a = elementAId.trim()
  const b = elementBId.trim()
  if (!a || !b || !elements.length) return null
  const ea = elements.find((e) => e.id === a)
  const eb = elements.find((e) => e.id === b)
  if (!ea || !eb || !ea.faceIndices.length || !eb.faceIndices.length) return null
  return [...new Set([...ea.faceIndices, ...eb.faceIndices])]
}
