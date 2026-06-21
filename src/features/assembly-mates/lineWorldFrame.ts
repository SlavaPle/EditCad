import { BufferGeometry, Vector3 } from 'three'
import type { PhantomTransform } from '../pre-assembly/model'
import { getGeometryCenterOffset, rotationMatrixFromTransform } from './planeWorldFrame'
import type { MateLineRef } from './model'

export type LineWorldFrame = {
  direction: Vector3
  point: Vector3
}

function localLineFrame(
  geometry: BufferGeometry,
  line: MateLineRef,
): { direction: Vector3; point: Vector3 } | null {
  const position = geometry.getAttribute('position')
  if (!position) return null

  const ax = position.getX(line.vertexA)
  const ay = position.getY(line.vertexA)
  const az = position.getZ(line.vertexA)
  const bx = position.getX(line.vertexB)
  const by = position.getY(line.vertexB)
  const bz = position.getZ(line.vertexB)

  const direction = new Vector3(bx - ax, by - ay, bz - az)
  if (direction.lengthSq() < 1e-18) return null
  direction.normalize()

  const point = new Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)
  return { direction, point }
}

/** Kierunek i punkt na linii w układzie montażu (mm). */
export function mateLineWorldFrame(
  geometry: BufferGeometry,
  transform: PhantomTransform,
  line: MateLineRef,
): LineWorldFrame | null {
  const local = localLineFrame(geometry, line)
  if (!local) return null

  const centerOffset = getGeometryCenterOffset(geometry)
  const rot = rotationMatrixFromTransform(transform)
  const pos = new Vector3(...transform.positionMm)

  const worldDirection = local.direction.clone().transformDirection(rot).normalize()
  const worldPoint = pos.clone().add(local.point.clone().add(centerOffset).applyMatrix4(rot))
  return { direction: worldDirection, point: worldPoint }
}

export function localLineSegmentPositions(
  geometry: BufferGeometry,
  line: MateLineRef,
): [number, number, number, number, number, number] | null {
  const position = geometry.getAttribute('position')
  if (!position) return null
  return [
    position.getX(line.vertexA),
    position.getY(line.vertexA),
    position.getZ(line.vertexA),
    position.getX(line.vertexB),
    position.getY(line.vertexB),
    position.getZ(line.vertexB),
  ]
}

/** Wektor prostopadły do kierunku linii (do signed gap). */
export function lineOffsetAxis(direction: Vector3, out = new Vector3()): Vector3 {
  const dir = direction.clone().normalize()
  out.set(Math.abs(dir.x) < 0.9 ? 1 : 0, Math.abs(dir.x) < 0.9 ? 0 : 1, 0)
  out.cross(dir)
  if (out.lengthSq() < 1e-12) {
    out.set(0, 0, 1).cross(dir)
  }
  return out.normalize()
}

/** Wektor prostopadły między równoległymi liniami (od A do B). */
export function parallelLinesPerpendicular(
  frameA: LineWorldFrame,
  frameB: LineWorldFrame,
  out = new Vector3(),
): Vector3 {
  const dir = frameA.direction.clone().normalize()
  const w = frameB.point.clone().sub(frameA.point)
  return out.copy(w).sub(dir.multiplyScalar(w.dot(dir)))
}

/** Odległość prostopadła między równoległymi liniami. */
export function parallelLinesDistance(frameA: LineWorldFrame, frameB: LineWorldFrame): number {
  return parallelLinesPerpendicular(frameA, frameB).length()
}

/** Podpisana odległość wzdłuż osi prostopadłej do kierunku linii A. */
export function signedParallelLinesGap(frameA: LineWorldFrame, frameB: LineWorldFrame): number {
  const perp = parallelLinesPerpendicular(frameA, frameB)
  if (perp.lengthSq() < 1e-18) return 0
  const axis = lineOffsetAxis(frameA.direction)
  return perp.dot(axis)
}
