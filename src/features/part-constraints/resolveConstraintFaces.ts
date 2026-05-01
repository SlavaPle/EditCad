import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'

/**
 * Lista indeksów trójkątów (ścian siatki) dla pary grup elementów lub legacy facePair.
 */
export function resolveTriangleIndicesForConstraint(
  c: FaceConstraint,
  elements: readonly PreparedModelElement[] | undefined,
): readonly number[] | null {
  if (c.type === 'block' || c.type === 'panel') return null
  const eidA = c.elementAId?.trim()
  const eidB = c.elementBId?.trim()
  if (eidA && eidB && elements && elements.length > 0) {
    const ea = elements.find((e) => e.id === eidA)
    const eb = elements.find((e) => e.id === eidB)
    if (!ea || !eb) return null
    return [...ea.faceIndices, ...eb.faceIndices]
  }
  if (c.facePair) return [c.facePair.a, c.facePair.b]
  return null
}
