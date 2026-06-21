import { BufferGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { PhantomTransform } from '../pre-assembly/model'
import { degToRad } from '../pre-assembly/phantomUnits'
import {
  lineOffsetAxis,
  mateLineWorldFrame,
  parallelLinesPerpendicular,
} from './lineWorldFrame'
import type { MateAlignment, MateLineRef } from './model'
import { getGeometryCenterOffset } from './planeWorldFrame'

const RAD_TO_DEG = 180 / Math.PI

export type ParallelLineMateSolverReason = 'invalidGeometry' | 'invalidLine'

export type ParallelLineMateSolverInput = {
  lineA: MateLineRef
  lineB: MateLineRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  alignment: MateAlignment
  offsetMm: number
}

export type ParallelLineMateSolverResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: ParallelLineMateSolverReason }

function rotationDegFromMatrix(rot: Matrix4): PhantomTransform['rotationDeg'] {
  const euler = new Euler().setFromRotationMatrix(rot, 'XYZ')
  return [
    euler.x * RAD_TO_DEG,
    euler.y * RAD_TO_DEG,
    euler.z * RAD_TO_DEG,
  ] as PhantomTransform['rotationDeg']
}

const scratchAxis = new Vector3()

function quaternionAlignDirections(from: Vector3, to: Vector3): Quaternion {
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

/** Wyrównuje kierunek linii B do A; detal A pozostaje, zwraca nowy transform B. */
export function solveParallelLineMate(input: ParallelLineMateSolverInput): ParallelLineMateSolverResult {
  const frameA = mateLineWorldFrame(input.geometryA, input.transformA, input.lineA)
  const frameB = mateLineWorldFrame(input.geometryB, input.transformB, input.lineB)
  if (!frameA || !frameB) {
    return { ok: false, reason: 'invalidLine' }
  }

  const dirA = frameA.direction
  const dirB = frameB.direction
  const targetDirection =
    input.alignment === 'faceToFace' ? dirA.clone().negate().normalize() : dirA.clone().normalize()

  const qAlign = quaternionAlignDirections(dirB, targetDirection)
  const centerOffsetB = getGeometryCenterOffset(input.geometryB)
  let transformB = rotateTransformAroundPivot(input.transformB, centerOffsetB, qAlign)

  const frameBAfter = mateLineWorldFrame(input.geometryB, transformB, input.lineB)
  if (!frameBAfter) {
    return { ok: false, reason: 'invalidLine' }
  }

  const perp = parallelLinesPerpendicular(frameA, frameBAfter)
  const offsetAxis = lineOffsetAxis(frameA.direction)
  const translation = offsetAxis.clone().multiplyScalar(input.offsetMm).sub(perp)
  transformB = {
    ...transformB,
    positionMm: [
      transformB.positionMm[0] + translation.x,
      transformB.positionMm[1] + translation.y,
      transformB.positionMm[2] + translation.z,
    ] as PhantomTransform['positionMm'],
  }

  return { ok: true, transform: transformB }
}
