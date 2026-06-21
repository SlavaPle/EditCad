import { Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateLineRef, MatePlaneRef, MateVertexRef } from '../model'
import { mateLineWorldFrame } from '../lineWorldFrame'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import { mateVertexWorldFrame } from '../vertexWorldFrame'
import {
  pointLineDistance,
  pointOnCylinderAroundLine,
  signedPointPlaneDistance,
  translateTransform,
} from './transformMath'

export type ProjectResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: 'invalidGeometry' }

export type ProjectVertexVertexInput = {
  vertexA: MateVertexRef
  vertexB: MateVertexRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  offsetMm: number
}

/** Odległość między wierzchołkami — zachowuje kierunek A→B. */
export function projectVertexVertex(input: ProjectVertexVertexInput): ProjectResult {
  const frameA = mateVertexWorldFrame(input.geometryA, input.transformA, input.vertexA)
  const frameB = mateVertexWorldFrame(input.geometryB, input.transformB, input.vertexB)
  if (!frameA || !frameB) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const delta = frameB.point.clone().sub(frameA.point)
  const dist = delta.length()
  let translation = new Vector3()

  if (input.offsetMm <= 1e-9) {
    translation = frameA.point.clone().sub(frameB.point)
  } else if (dist < 1e-9) {
    translation.set(input.offsetMm, 0, 0)
  } else {
    const target = frameA.point.clone().add(delta.normalize().multiplyScalar(input.offsetMm))
    translation = target.sub(frameB.point)
  }

  return { ok: true, transform: translateTransform(input.transformB, translation) }
}

export type ProjectPlaneVertexInput = {
  planeA: MatePlaneRef
  vertexB: MateVertexRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  offsetMm: number
}

export function projectPlaneVertex(input: ProjectPlaneVertexInput): ProjectResult {
  const planeFrame = matePlaneWorldFrame(input.geometryA, input.transformA, input.planeA.faceIndices)
  const vertexFrame = mateVertexWorldFrame(input.geometryB, input.transformB, input.vertexB)
  if (!planeFrame || !vertexFrame) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const gap = signedPointPlaneDistance(vertexFrame.point, planeFrame.point, planeFrame.normal)
  const delta = input.offsetMm - gap
  return { ok: true, transform: translateTransform(input.transformB, planeFrame.normal.clone().multiplyScalar(delta)) }
}

export type ProjectVertexPlaneInput = {
  vertexA: MateVertexRef
  planeB: MatePlaneRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  offsetMm: number
}

export function projectVertexPlane(input: ProjectVertexPlaneInput): ProjectResult {
  const vertexFrame = mateVertexWorldFrame(input.geometryA, input.transformA, input.vertexA)
  const planeFrame = matePlaneWorldFrame(input.geometryB, input.transformB, input.planeB.faceIndices)
  if (!vertexFrame || !planeFrame) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const gap = signedPointPlaneDistance(vertexFrame.point, planeFrame.point, planeFrame.normal)
  const delta = input.offsetMm - gap
  return { ok: true, transform: translateTransform(input.transformB, planeFrame.normal.clone().multiplyScalar(delta)) }
}

export type ProjectLineVertexInput = {
  lineA: MateLineRef
  vertexB: MateVertexRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  offsetMm: number
}

export function projectLineVertex(input: ProjectLineVertexInput): ProjectResult {
  const lineFrame = mateLineWorldFrame(input.geometryA, input.transformA, input.lineA)
  const vertexFrame = mateVertexWorldFrame(input.geometryB, input.transformB, input.vertexB)
  if (!lineFrame || !vertexFrame) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const target = pointOnCylinderAroundLine(
    vertexFrame.point,
    lineFrame.point,
    lineFrame.direction,
    input.offsetMm,
  )
  return { ok: true, transform: translateTransform(input.transformB, target.sub(vertexFrame.point)) }
}

export type ProjectVertexLineInput = {
  vertexA: MateVertexRef
  lineB: MateLineRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  offsetMm: number
}

export function projectVertexLine(input: ProjectVertexLineInput): ProjectResult {
  const vertexFrame = mateVertexWorldFrame(input.geometryA, input.transformA, input.vertexA)
  const lineFrame = mateLineWorldFrame(input.geometryB, input.transformB, input.lineB)
  if (!vertexFrame || !lineFrame) {
    return { ok: false, reason: 'invalidGeometry' }
  }

  const target = pointOnCylinderAroundLine(
    vertexFrame.point,
    lineFrame.point,
    lineFrame.direction,
    input.offsetMm,
  )
  const { closest } = pointLineDistance(vertexFrame.point, lineFrame.point, lineFrame.direction)
  return { ok: true, transform: translateTransform(input.transformB, target.sub(closest)) }
}
