import { BufferGeometry, Vector3 } from 'three'
import type { PhantomTransform } from '../pre-assembly/model'
import { getGeometryCenterOffset, rotationMatrixFromTransform } from './planeWorldFrame'
import type { MateVertexRef } from './model'

export type VertexWorldFrame = {
  point: Vector3
}

/** Pozycja wierzchołka w układzie montażu (mm). */
export function mateVertexWorldFrame(
  geometry: BufferGeometry,
  transform: PhantomTransform,
  vertex: MateVertexRef,
): VertexWorldFrame | null {
  const position = geometry.getAttribute('position')
  if (!position || vertex.vertexIndex < 0 || vertex.vertexIndex >= position.count) {
    return null
  }

  const centerOffset = getGeometryCenterOffset(geometry)
  const rot = rotationMatrixFromTransform(transform)
  const pos = new Vector3(...transform.positionMm)

  const localPoint = new Vector3(
    position.getX(vertex.vertexIndex),
    position.getY(vertex.vertexIndex),
    position.getZ(vertex.vertexIndex),
  )
  const worldPoint = pos.clone().add(localPoint.clone().add(centerOffset).applyMatrix4(rot))
  return { point: worldPoint }
}
