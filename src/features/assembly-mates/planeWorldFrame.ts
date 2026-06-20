import { Box3, BufferGeometry, Euler, Matrix4, Vector3 } from 'three'
import type { PhantomTransform } from '../pre-assembly/model'
import { degToRad } from '../pre-assembly/phantomUnits'

/** Offset geometry tak jak w InteractiveProgramPartsLayer (środek bbox → origin grupy). */
export function getGeometryCenterOffset(geometry: BufferGeometry): Vector3 {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox ?? new Box3()
  const center = new Vector3()
  box.getCenter(center)
  return center.negate()
}

function rotationMatrixFromTransform(transform: PhantomTransform): Matrix4 {
  const euler = new Euler(
    degToRad(transform.rotationDeg[0]),
    degToRad(transform.rotationDeg[1]),
    degToRad(transform.rotationDeg[2]),
    'XYZ',
  )
  return new Matrix4().makeRotationFromEuler(euler)
}

function triangleVertexIndices(geometry: BufferGeometry, faceIndex: number): [number, number, number] {
  const index = geometry.getIndex()
  if (index) {
    const base = faceIndex * 3
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
  }
  const ia = faceIndex * 3
  return [ia, ia + 1, ia + 2]
}

function triangleNormal(geometry: BufferGeometry, faceIndex: number, out: Vector3): Vector3 {
  const pos = geometry.getAttribute('position')
  if (!pos) {
    out.set(0, 0, 1)
    return out
  }
  const [ia, ib, ic] = triangleVertexIndices(geometry, faceIndex)
  const ax = pos.getX(ia)
  const ay = pos.getY(ia)
  const az = pos.getZ(ia)
  const bx = pos.getX(ib)
  const by = pos.getY(ib)
  const bz = pos.getZ(ib)
  const cx = pos.getX(ic)
  const cy = pos.getY(ic)
  const cz = pos.getZ(ic)
  const abx = bx - ax
  const aby = by - ay
  const abz = bz - az
  const acx = cx - ax
  const acy = cy - ay
  const acz = cz - az
  out.set(aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx)
  const len = out.length()
  if (len < 1e-15) {
    out.set(0, 0, 1)
  } else {
    out.divideScalar(len)
  }
  return out
}

function triangleCentroid(geometry: BufferGeometry, faceIndex: number, out: Vector3): Vector3 {
  const pos = geometry.getAttribute('position')
  if (!pos) {
    out.set(0, 0, 0)
    return out
  }
  const [ia, ib, ic] = triangleVertexIndices(geometry, faceIndex)
  out.set(
    (pos.getX(ia) + pos.getX(ib) + pos.getX(ic)) / 3,
    (pos.getY(ia) + pos.getY(ib) + pos.getY(ic)) / 3,
    (pos.getZ(ia) + pos.getZ(ib) + pos.getZ(ic)) / 3,
  )
  return out
}

export type PlaneWorldFrame = {
  normal: Vector3
  point: Vector3
}

/** Punkt i normalna płaszczyzny w układzie montażu (mm), uśrednione po łacie. */
export function matePlaneWorldFrame(
  geometry: BufferGeometry,
  transform: PhantomTransform,
  faceIndices: readonly number[],
): PlaneWorldFrame | null {
  if (faceIndices.length === 0) return null
  const centerOffset = getGeometryCenterOffset(geometry)
  const rot = rotationMatrixFromTransform(transform)
  const pos = new Vector3(...transform.positionMm)

  const localNormal = new Vector3()
  const localPoint = new Vector3()
  triangleNormal(geometry, faceIndices[0]!, localNormal)

  localPoint.set(0, 0, 0)
  for (const faceIndex of faceIndices) {
    const c = triangleCentroid(geometry, faceIndex, new Vector3())
    localPoint.add(c)
  }
  localPoint.divideScalar(faceIndices.length)

  const worldNormal = localNormal.clone().transformDirection(rot).normalize()
  const worldPoint = pos
    .clone()
    .add(localPoint.clone().add(centerOffset).applyMatrix4(rot))

  return { normal: worldNormal, point: worldPoint }
}
