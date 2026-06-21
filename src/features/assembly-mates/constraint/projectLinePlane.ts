import { Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateLineRef, MatePlaneRef } from '../model'
import { lineOffsetAxis, mateLineWorldFrame } from '../lineWorldFrame'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import {
  quaternionAlignDirections,
  rotateTransformAroundPivot,
  signedLinePlaneDistance,
  translateTransform,
} from './transformMath'

export type ProjectResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: 'invalidGeometry' }

export type ProjectPlaneLineInput = {
  planeA: MatePlaneRef
  lineB: MateLineRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  offsetMm: number
}

export function projectPlaneLine(input: ProjectPlaneLineInput): ProjectResult {
  const planeFrame = matePlaneWorldFrame(input.geometryA, input.transformA, input.planeA.faceIndices)
  const lineFrame = mateLineWorldFrame(input.geometryB, input.transformB, input.lineB)
  if (!planeFrame || !lineFrame) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const nA = planeFrame.normal
  const dirB = lineFrame.direction
  const pivot = lineFrame.point.clone()

  let transformB = input.transformB
  const dot = Math.abs(dirB.dot(nA))
  if (dot > 1e-4) {
    const targetDir = dirB.clone().sub(nA.clone().multiplyScalar(dirB.dot(nA)))
    if (targetDir.lengthSq() > 1e-12) {
      const qAlign = quaternionAlignDirections(dirB, targetDir.normalize())
      transformB = rotateTransformAroundPivot(transformB, pivot, qAlign)
    }
  }

  const lineAfter = mateLineWorldFrame(input.geometryB, transformB, input.lineB)
  if (!lineAfter) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const gap = signedLinePlaneDistance(lineAfter.point, lineAfter.direction, planeFrame.point, planeFrame.normal)
  const delta = input.offsetMm - gap
  transformB = translateTransform(transformB, nA.clone().multiplyScalar(delta))

  return { ok: true, transform: transformB }
}

export type ProjectLinePlaneInput = {
  lineA: MateLineRef
  planeB: MatePlaneRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  offsetMm: number
}

function normalPerpendicularToLine(lineDir: Vector3, hint: Vector3): Vector3 {
  const dir = lineDir.clone().normalize()
  let perp = dir.clone().cross(hint)
  if (perp.lengthSq() < 1e-12) {
    perp = dir.clone().cross(lineOffsetAxis(dir))
  }
  return perp.normalize()
}

export function projectLinePlane(input: ProjectLinePlaneInput): ProjectResult {
  const lineFrame = mateLineWorldFrame(input.geometryA, input.transformA, input.lineA)
  const planeFrame = matePlaneWorldFrame(input.geometryB, input.transformB, input.planeB.faceIndices)
  if (!lineFrame || !planeFrame) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const dirA = lineFrame.direction
  const nB = planeFrame.normal
  const pivot = planeFrame.point.clone()

  let transformB = input.transformB
  const targetNormal = normalPerpendicularToLine(dirA, nB)
  if (Math.abs(nB.dot(dirA)) > 1e-4) {
    const qAlign = quaternionAlignDirections(nB, targetNormal)
    transformB = rotateTransformAroundPivot(transformB, pivot, qAlign)
  }

  const planeAfter = matePlaneWorldFrame(input.geometryB, transformB, input.planeB.faceIndices)
  if (!planeAfter) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const gap = signedLinePlaneDistance(lineFrame.point, lineFrame.direction, planeAfter.point, planeAfter.normal)
  const delta = input.offsetMm - gap
  transformB = translateTransform(transformB, planeAfter.normal.clone().multiplyScalar(delta))

  return { ok: true, transform: transformB }
}
