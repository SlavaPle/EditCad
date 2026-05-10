import type { BufferGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import { resolveTriangleIndicesForConstraint } from './resolveConstraintFaces'

export function measurePreparedElementPairGapMm(
  geometry: BufferGeometry,
  elementAId: string,
  elementBId: string,
  elements: readonly PreparedModelElement[] | undefined,
): number | null {
  const a = elementAId.trim()
  const b = elementBId.trim()
  if (!a || !b || !elements?.length) return null
  const ea = elements.find((e) => e.id === a)
  const eb = elements.find((e) => e.id === b)
  if (!ea || !eb) return null
  const faces = [...ea.faceIndices, ...eb.faceIndices]
  const an = analyzeTwoFaceStretch(geometry, faces)
  return an.ok ? an.gapMm : null
}

export function measureConstraintPairGapMm(
  geometry: BufferGeometry,
  c: FaceConstraint,
  elements: readonly PreparedModelElement[] | undefined,
): number | null {
  if (c.type === 'block' || c.type === 'panel') return null
  const faces = resolveTriangleIndicesForConstraint(c, elements)
  if (!faces || faces.length < 2) return null
  const an = analyzeTwoFaceStretch(geometry, faces)
  return an.ok ? an.gapMm : null
}
