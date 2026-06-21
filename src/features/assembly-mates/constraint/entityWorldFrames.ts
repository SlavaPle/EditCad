import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import { mateLineWorldFrame, type LineWorldFrame } from '../lineWorldFrame'
import { matePlaneWorldFrame, type PlaneWorldFrame } from '../planeWorldFrame'
import { mateVertexWorldFrame, type VertexWorldFrame } from '../vertexWorldFrame'
import type { MateEntityRef } from '../model'
import { asMateLineRef, asMatePlaneRef, asMateVertexRef } from '../mateEntityRef'

export type EntityWorldFrame =
  | { kind: 'plane'; frame: PlaneWorldFrame }
  | { kind: 'line'; frame: LineWorldFrame }
  | { kind: 'vertex'; frame: VertexWorldFrame }

export function entityWorldFrame(
  entity: MateEntityRef,
  geometry: BufferGeometry,
  transform: PhantomTransform,
): EntityWorldFrame | null {
  const plane = asMatePlaneRef(entity)
  if (plane) {
    const frame = matePlaneWorldFrame(geometry, transform, plane.faceIndices)
    return frame ? { kind: 'plane', frame } : null
  }
  const line = asMateLineRef(entity)
  if (line) {
    const frame = mateLineWorldFrame(geometry, transform, line)
    return frame ? { kind: 'line', frame } : null
  }
  const vertex = asMateVertexRef(entity)
  if (vertex) {
    const frame = mateVertexWorldFrame(geometry, transform, vertex)
    return frame ? { kind: 'vertex', frame } : null
  }
  return null
}

export function entityWorldPivot(
  entity: MateEntityRef,
  geometry: BufferGeometry,
  transform: PhantomTransform,
): import('three').Vector3 | null {
  const wf = entityWorldFrame(entity, geometry, transform)
  if (!wf) return null
  if (wf.kind === 'plane') return wf.frame.point
  if (wf.kind === 'line') return wf.frame.point
  return wf.frame.point
}
