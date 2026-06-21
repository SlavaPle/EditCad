import type { BufferGeometry } from 'three'
import { Vector3 } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import {
  lineOffsetAxis,
  mateLineWorldFrame,
  parallelLinesPerpendicular,
} from '../lineWorldFrame'
import type { MateAlignment, MateLineRef } from '../model'
import {
  quaternionAlignDirections,
  rotateTransformAroundPivot,
  translateTransform,
} from './transformMath'

export type ProjectResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: 'invalidGeometry' }

export type ProjectLineLineInput = {
  lineA: MateLineRef
  lineB: MateLineRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  alignment: MateAlignment
  offsetMm: number
}

/** Równoległe linie — zachowuje kąt wokół osi po wyrównaniu kierunku. */
export function projectLineLine(input: ProjectLineLineInput): ProjectResult {
  const frameA = mateLineWorldFrame(input.geometryA, input.transformA, input.lineA)
  const frameB = mateLineWorldFrame(input.geometryB, input.transformB, input.lineB)
  if (!frameA || !frameB) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const dirA = frameA.direction
  const dirB = frameB.direction
  const targetDirection =
    input.alignment === 'faceToFace' ? dirA.clone().negate().normalize() : dirA.clone().normalize()

  const pivot = frameB.point.clone()
  let transformB = input.transformB

  if (dirB.dot(targetDirection) < 1 - 1e-4) {
    const qAlign = quaternionAlignDirections(dirB, targetDirection)
    transformB = rotateTransformAroundPivot(transformB, pivot, qAlign)
  }

  const frameBAfter = mateLineWorldFrame(input.geometryB, transformB, input.lineB)
  if (!frameBAfter) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const perp = parallelLinesPerpendicular(frameA, frameBAfter)
  let translation = new Vector3()

  if (input.offsetMm <= 1e-9) {
    translation.copy(perp).negate()
  } else {
    const perpLen = perp.length()
    if (perpLen > 1e-9) {
      translation.copy(perp).multiplyScalar(input.offsetMm / perpLen - 1)
    } else {
      translation.copy(lineOffsetAxis(frameA.direction)).multiplyScalar(input.offsetMm)
    }
  }

  transformB = translateTransform(transformB, translation)

  return { ok: true, transform: transformB }
}
