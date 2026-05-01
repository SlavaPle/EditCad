import type { BufferGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import { resolveTriangleIndicesForConstraint } from './resolveConstraintFaces'

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
