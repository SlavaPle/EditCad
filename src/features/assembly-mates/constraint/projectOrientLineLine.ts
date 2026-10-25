import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateLineRef } from '../model'
import { mateLineWorldFrame } from '../lineWorldFrame'
import { quaternionOrientDirections } from './orientDirectionsAtAngle'
import { rotateTransformAroundPivot } from './transformMath'
import type { ProjectOrientResult } from './projectOrientPlanePlane'

export type ProjectOrientLineLineInput = {
  lineA: MateLineRef
  lineB: MateLineRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  angleRad: number
  flipped: boolean
  invertReference?: boolean
}

/** Orientacja kierunków linii pod zadanym kątem (bez offsetu). */
export function projectOrientLineLine(input: ProjectOrientLineLineInput): ProjectOrientResult {
  const frameA = mateLineWorldFrame(input.geometryA, input.transformA, input.lineA)
  const frameB = mateLineWorldFrame(input.geometryB, input.transformB, input.lineB)
  if (!frameA || !frameB) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const reference = input.invertReference
    ? frameA.direction.clone().negate()
    : frameA.direction
  const qAlign = quaternionOrientDirections(
    frameB.direction,
    reference,
    input.angleRad,
    input.flipped,
  )
  const transformB = rotateTransformAroundPivot(input.transformB, frameB.point.clone(), qAlign)
  return { ok: true, transform: transformB }
}
