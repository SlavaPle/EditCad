import { BufferGeometry, Vector3 } from 'three'
import type { PhantomTransform } from '../pre-assembly/model'
import { ellipseCenterFromVertexChain } from '../model-selection/edgeEllipseSelection'
import { getGeometryCenterOffset, rotationMatrixFromTransform } from './planeWorldFrame'
import type { MateEllipseCenterRef } from './model'
import type { VertexWorldFrame } from './vertexWorldFrame'

/** Środek łuku/elipsy w układzie montażu (mm) — jak wierzchołek. */
export function mateEllipseCenterWorldFrame(
  geometry: BufferGeometry,
  transform: PhantomTransform,
  centerRef: MateEllipseCenterRef,
): VertexWorldFrame | null {
  const local = ellipseCenterFromVertexChain(geometry, centerRef.vertexIndices)
  if (!local) return null

  const centerOffset = getGeometryCenterOffset(geometry)
  const rot = rotationMatrixFromTransform(transform)
  const pos = new Vector3(...transform.positionMm)
  const localPoint = new Vector3(local.center[0], local.center[1], local.center[2])
  const worldPoint = pos.clone().add(localPoint.clone().add(centerOffset).applyMatrix4(rot))
  return { point: worldPoint }
}
