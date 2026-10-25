import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MatePlaneRef } from '../model'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import { quaternionOrientDirections } from './orientDirectionsAtAngle'
import { rotateTransformAroundPivot } from './transformMath'

export type ProjectOrientPlanePlaneInput = {
  planeA: MatePlaneRef
  planeB: MatePlaneRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  angleRad: number
  flipped: boolean
  /** faceToFace dla angular — odniesienie −normalA. */
  invertReference?: boolean
}

export type ProjectOrientResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: 'invalidGeometry' }

/** Orientacja normalnych płaszczyzn pod zadanym kątem (bez offsetu). */
export function projectOrientPlanePlane(input: ProjectOrientPlanePlaneInput): ProjectOrientResult {
  const frameA = matePlaneWorldFrame(input.geometryA, input.transformA, input.planeA.faceIndices)
  const frameB = matePlaneWorldFrame(input.geometryB, input.transformB, input.planeB.faceIndices)
  if (!frameA || !frameB) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const reference = input.invertReference ? frameA.normal.clone().negate() : frameA.normal
  const qAlign = quaternionOrientDirections(
    frameB.normal,
    reference,
    input.angleRad,
    input.flipped,
  )
  const transformB = rotateTransformAroundPivot(input.transformB, frameB.point.clone(), qAlign)
  return { ok: true, transform: transformB }
}
