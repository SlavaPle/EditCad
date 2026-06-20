import { BufferGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { PhantomTransform } from '../pre-assembly/model'
import { degToRad } from '../pre-assembly/phantomUnits'
import type { MateAlignment, MatePlaneRef } from './model'
import { getGeometryCenterOffset, matePlaneWorldFrame } from './planeWorldFrame'

const PARALLEL_ABS_DOT_MIN = 0.92
const RAD_TO_DEG = 180 / Math.PI

export type ParallelMateSolverReason = 'notParallel' | 'invalidGeometry' | 'invalidPlane'

export type ParallelMateSolverInput = {
  planeA: MatePlaneRef
  planeB: MatePlaneRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  alignment: MateAlignment
  offsetMm: number
}

export type ParallelMateSolverResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: ParallelMateSolverReason }

function rotationDegFromMatrix(rot: Matrix4): PhantomTransform['rotationDeg'] {
  const euler = new Euler().setFromRotationMatrix(rot, 'XYZ')
  return [
    euler.x * RAD_TO_DEG,
    euler.y * RAD_TO_DEG,
    euler.z * RAD_TO_DEG,
  ] as PhantomTransform['rotationDeg']
}

const scratchAxis = new Vector3()

function quaternionAlignNormals(from: Vector3, to: Vector3): Quaternion {
  const f = from.clone().normalize()
  const t = to.clone().normalize()
  const dot = f.dot(t)
  if (dot > 1 - 1e-6) {
    return new Quaternion()
  }
  if (dot < -1 + 1e-6) {
    scratchAxis.set(Math.abs(f.x) < 0.9 ? 1 : 0, Math.abs(f.x) < 0.9 ? 0 : 1, 0)
    scratchAxis.cross(f).normalize()
    return new Quaternion().setFromAxisAngle(scratchAxis, Math.PI)
  }
  return new Quaternion().setFromUnitVectors(f, t)
}

function rotateTransformAroundPivot(
  transform: PhantomTransform,
  centerOffset: Vector3,
  qAlign: Quaternion,
): PhantomTransform {
  const pos = new Vector3(...transform.positionMm)
  const qCurrent = new Quaternion().setFromEuler(
    new Euler(
      degToRad(transform.rotationDeg[0]),
      degToRad(transform.rotationDeg[1]),
      degToRad(transform.rotationDeg[2]),
      'XYZ',
    ),
  )
  const rot = new Matrix4().makeRotationFromQuaternion(qCurrent)
  const geometryCenter = pos.clone().add(centerOffset.clone().applyMatrix4(rot))
  const qNew = qAlign.clone().multiply(qCurrent)
  const newRot = new Matrix4().makeRotationFromQuaternion(qNew)
  const newPos = geometryCenter.clone().sub(centerOffset.clone().applyMatrix4(newRot))

  return {
    positionMm: [newPos.x, newPos.y, newPos.z] as PhantomTransform['positionMm'],
    rotationDeg: rotationDegFromMatrix(newRot),
  }
}

/** Wyrównuje płaszczyznę B do A; detal A pozostaje, zwraca nowy transform B. */
export function solveParallelMate(input: ParallelMateSolverInput): ParallelMateSolverResult {
  const frameA = matePlaneWorldFrame(input.geometryA, input.transformA, input.planeA.faceIndices)
  const frameB = matePlaneWorldFrame(input.geometryB, input.transformB, input.planeB.faceIndices)
  if (!frameA || !frameB) {
    return { ok: false, reason: 'invalidPlane' }
  }

  const nA = frameA.normal
  const nB = frameB.normal
  if (Math.abs(nA.dot(nB)) < PARALLEL_ABS_DOT_MIN && Math.abs(nA.dot(nB.clone().negate())) < PARALLEL_ABS_DOT_MIN) {
    return { ok: false, reason: 'notParallel' }
  }

  const targetNormal =
    input.alignment === 'faceToFace' ? nA.clone().negate().normalize() : nA.clone().normalize()

  const qAlign = quaternionAlignNormals(nB, targetNormal)

  const centerOffsetB = getGeometryCenterOffset(input.geometryB)
  let transformB = rotateTransformAroundPivot(input.transformB, centerOffsetB, qAlign)

  const frameBAfter = matePlaneWorldFrame(input.geometryB, transformB, input.planeB.faceIndices)
  if (!frameBAfter) {
    return { ok: false, reason: 'invalidPlane' }
  }

  const gap = frameBAfter.point.clone().sub(frameA.point).dot(nA)
  const delta = input.offsetMm - gap
  transformB = {
    ...transformB,
    positionMm: [
      transformB.positionMm[0] + nA.x * delta,
      transformB.positionMm[1] + nA.y * delta,
      transformB.positionMm[2] + nA.z * delta,
    ] as PhantomTransform['positionMm'],
  }

  return { ok: true, transform: transformB }
}
