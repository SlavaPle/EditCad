import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateAlignment, MateLineRef, MatePlaneRef } from '../model'
import { mateLineWorldFrame } from '../lineWorldFrame'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import {
  absoluteInPlaneLineDirection,
  absoluteNormalParallelToLine,
} from './parallelOrientationTargets'
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
  alignment?: MateAlignment
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
  const alignment = input.alignment ?? 'faceToFace'

  let transformB = input.transformB
  const targetDir = absoluteInPlaneLineDirection(nA, dirB, alignment)

  if (dirB.dot(targetDir) < 1 - 1e-4) {
    const qAlign = quaternionAlignDirections(dirB, targetDir)
    transformB = rotateTransformAroundPivot(transformB, pivot, qAlign)
  }

  const lineAfter = mateLineWorldFrame(input.geometryB, transformB, input.lineB)
  if (!lineAfter) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const gap = signedLinePlaneDistance(
    lineAfter.point,
    lineAfter.direction,
    planeFrame.point,
    planeFrame.normal,
  )
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
  alignment?: MateAlignment
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
  const alignment = input.alignment ?? 'faceToFace'

  let transformB = input.transformB
  const targetNormal = absoluteNormalParallelToLine(dirA, nB, alignment)

  if (nB.dot(targetNormal) < 1 - 1e-4) {
    const qAlign = quaternionAlignDirections(nB, targetNormal)
    transformB = rotateTransformAroundPivot(transformB, pivot, qAlign)
  }

  const planeAfter = matePlaneWorldFrame(input.geometryB, transformB, input.planeB.faceIndices)
  if (!planeAfter) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const gap = signedLinePlaneDistance(
    lineFrame.point,
    lineFrame.direction,
    planeAfter.point,
    planeAfter.normal,
  )
  const delta = gap - input.offsetMm
  transformB = translateTransform(transformB, planeAfter.normal.clone().multiplyScalar(delta))

  return { ok: true, transform: transformB }
}
