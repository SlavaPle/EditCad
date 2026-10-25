import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateLineRef, MatePlaneRef } from '../model'
import { mateLineWorldFrame } from '../lineWorldFrame'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import { quaternionOrientDirections } from './orientDirectionsAtAngle'
import { rotateTransformAroundPivot } from './transformMath'
import type { ProjectOrientResult } from './projectOrientPlanePlane'

export type ProjectOrientPlaneLineInput = {
  planeA: MatePlaneRef
  lineB: MateLineRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  /** Kąt między kierunkiem linii a normalną płaszczyzny. */
  angleRad: number
  flipped: boolean
}

/** Linia względem płaszczyzny: kąt(dir, normal). */
export function projectOrientPlaneLine(input: ProjectOrientPlaneLineInput): ProjectOrientResult {
  const planeFrame = matePlaneWorldFrame(input.geometryA, input.transformA, input.planeA.faceIndices)
  const lineFrame = mateLineWorldFrame(input.geometryB, input.transformB, input.lineB)
  if (!planeFrame || !lineFrame) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const qAlign = quaternionOrientDirections(
    lineFrame.direction,
    planeFrame.normal,
    input.angleRad,
    input.flipped,
  )
  const transformB = rotateTransformAroundPivot(input.transformB, lineFrame.point.clone(), qAlign)
  return { ok: true, transform: transformB }
}

export type ProjectOrientLinePlaneInput = {
  lineA: MateLineRef
  planeB: MatePlaneRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  angleRad: number
  flipped: boolean
}

/** Płaszczyzna względem linii: kąt(normal, dir). */
export function projectOrientLinePlane(input: ProjectOrientLinePlaneInput): ProjectOrientResult {
  const lineFrame = mateLineWorldFrame(input.geometryA, input.transformA, input.lineA)
  const planeFrame = matePlaneWorldFrame(input.geometryB, input.transformB, input.planeB.faceIndices)
  if (!lineFrame || !planeFrame) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const qAlign = quaternionOrientDirections(
    planeFrame.normal,
    lineFrame.direction,
    input.angleRad,
    input.flipped,
  )
  const transformB = rotateTransformAroundPivot(input.transformB, planeFrame.point.clone(), qAlign)
  return { ok: true, transform: transformB }
}
