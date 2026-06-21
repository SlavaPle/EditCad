import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateAlignment, MatePlaneRef } from '../model'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import {
  quaternionAlignDirections,
  rotateTransformAroundPivot,
  translateTransform,
} from './transformMath'

export type ProjectPlanePlaneInput = {
  planeA: MatePlaneRef
  planeB: MatePlaneRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  alignment: MateAlignment
  offsetMm: number
}

export type ProjectResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: 'invalidGeometry' }

/** Równoległe płaszczyzny — minimalna korekta normalnej i odległości. */
export function projectPlanePlane(input: ProjectPlanePlaneInput): ProjectResult {
  const frameA = matePlaneWorldFrame(input.geometryA, input.transformA, input.planeA.faceIndices)
  const frameB = matePlaneWorldFrame(input.geometryB, input.transformB, input.planeB.faceIndices)
  if (!frameA || !frameB) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const nA = frameA.normal
  const nB = frameB.normal
  const targetNormal =
    input.alignment === 'faceToFace' ? nA.clone().negate().normalize() : nA.clone().normalize()

  const pivot = frameB.point.clone()
  let transformB = input.transformB

  const dot = nB.dot(targetNormal)
  if (dot < 1 - 1e-4) {
    const qAlign = quaternionAlignDirections(nB, targetNormal)
    transformB = rotateTransformAroundPivot(transformB, pivot, qAlign)
  }

  const frameBAfter = matePlaneWorldFrame(input.geometryB, transformB, input.planeB.faceIndices)
  if (!frameBAfter) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const gap = frameBAfter.point.clone().sub(frameA.point).dot(nA)
  const delta = input.offsetMm - gap
  transformB = translateTransform(transformB, nA.clone().multiplyScalar(delta))

  return { ok: true, transform: transformB }
}
