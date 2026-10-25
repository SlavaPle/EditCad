import { Vector3, type BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateAlignment, MateEntityRef } from '../model'
import { matePairKindForConstraint } from '../model'
import {
  asMateEllipseCenterRef,
  asMateLineRef,
  asMatePlaneRef,
  asMateVertexRef,
} from '../mateEntityRef'
import { mateEllipseCenterWorldFrame } from '../ellipseCenterWorldFrame'
import { mateLineWorldFrame } from '../lineWorldFrame'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import { mateVertexWorldFrame, type VertexWorldFrame } from '../vertexWorldFrame'
import { projectPlanePlane } from './projectPlanePlane'
import { projectLineLine } from './projectLineLineCore'
import { projectPlaneLine, projectLinePlane } from './projectLinePlane'
import {
  projectVertexVertex,
  projectPlaneVertex,
  projectVertexPlane,
  projectLineVertex,
  projectVertexLine,
} from './projectVertexPairs'
import {
  pointLineDistance,
  pointOnCylinderAroundLine,
  signedPointPlaneDistance,
  translateTransform,
} from './transformMath'

export type MateProjectReason = 'invalidGeometry' | 'unsupportedPair'

export type MateProjectInput = {
  entityA: MateEntityRef
  entityB: MateEntityRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  alignment: MateAlignment
  offsetMm: number
}

export type MateProjectResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: MateProjectReason }

function resolvePointFrame(
  entity: MateEntityRef,
  geometry: BufferGeometry,
  transform: PhantomTransform,
): VertexWorldFrame | null {
  const vertex = asMateVertexRef(entity)
  if (vertex) return mateVertexWorldFrame(geometry, transform, vertex)
  const center = asMateEllipseCenterRef(entity)
  if (center) return mateEllipseCenterWorldFrame(geometry, transform, center)
  return null
}

function projectPointPoint(
  frameA: VertexWorldFrame,
  frameB: VertexWorldFrame,
  transformB: PhantomTransform,
  offsetMm: number,
): MateProjectResult {
  const delta = frameB.point.clone().sub(frameA.point)
  const dist = delta.length()
  let translation = new Vector3()

  if (offsetMm <= 1e-9) {
    translation = frameA.point.clone().sub(frameB.point)
  } else if (dist < 1e-9) {
    translation.set(offsetMm, 0, 0)
  } else {
    const target = frameA.point.clone().add(delta.normalize().multiplyScalar(offsetMm))
    translation = target.sub(frameB.point)
  }

  return { ok: true, transform: translateTransform(transformB, translation) }
}

/** Minimalna korekta transformB na mnożestwie ograniczenia. */
export function projectMateConstraint(input: MateProjectInput): MateProjectResult {
  const pair = matePairKindForConstraint(input.entityA, input.entityB)

  switch (pair) {
    case 'plane-plane': {
      const planeA = asMatePlaneRef(input.entityA)
      const planeB = asMatePlaneRef(input.entityB)
      if (!planeA || !planeB) return { ok: false, reason: 'invalidGeometry' }
      return projectPlanePlane({ ...input, planeA, planeB })
    }
    case 'line-line': {
      const lineA = asMateLineRef(input.entityA)
      const lineB = asMateLineRef(input.entityB)
      if (!lineA || !lineB) return { ok: false, reason: 'invalidGeometry' }
      return projectLineLine({ ...input, lineA, lineB })
    }
    case 'vertex-vertex': {
      const vertexA = asMateVertexRef(input.entityA)
      const vertexB = asMateVertexRef(input.entityB)
      if (vertexA && vertexB) {
        return projectVertexVertex({ ...input, vertexA, vertexB })
      }
      const frameA = resolvePointFrame(input.entityA, input.geometryA, input.transformA)
      const frameB = resolvePointFrame(input.entityB, input.geometryB, input.transformB)
      if (!frameA || !frameB) return { ok: false, reason: 'invalidGeometry' }
      return projectPointPoint(frameA, frameB, input.transformB, input.offsetMm)
    }
    case 'plane-vertex': {
      const planeA = asMatePlaneRef(input.entityA)
      const vertexB = asMateVertexRef(input.entityB)
      if (planeA && vertexB) {
        return projectPlaneVertex({ ...input, planeA, vertexB })
      }
      if (!planeA) return { ok: false, reason: 'invalidGeometry' }
      const planeFrame = matePlaneWorldFrame(input.geometryA, input.transformA, planeA.faceIndices)
      const pointFrame = resolvePointFrame(input.entityB, input.geometryB, input.transformB)
      if (!planeFrame || !pointFrame) return { ok: false, reason: 'invalidGeometry' }
      const gap = signedPointPlaneDistance(pointFrame.point, planeFrame.point, planeFrame.normal)
      const delta = input.offsetMm - gap
      return {
        ok: true,
        transform: translateTransform(
          input.transformB,
          planeFrame.normal.clone().multiplyScalar(delta),
        ),
      }
    }
    case 'vertex-plane': {
      const vertexA = asMateVertexRef(input.entityA)
      const planeB = asMatePlaneRef(input.entityB)
      if (vertexA && planeB) {
        return projectVertexPlane({ ...input, vertexA, planeB })
      }
      if (!planeB) return { ok: false, reason: 'invalidGeometry' }
      const pointFrame = resolvePointFrame(input.entityA, input.geometryA, input.transformA)
      const planeFrame = matePlaneWorldFrame(input.geometryB, input.transformB, planeB.faceIndices)
      if (!pointFrame || !planeFrame) return { ok: false, reason: 'invalidGeometry' }
      const gap = signedPointPlaneDistance(pointFrame.point, planeFrame.point, planeFrame.normal)
      const delta = input.offsetMm - gap
      return {
        ok: true,
        transform: translateTransform(
          input.transformB,
          planeFrame.normal.clone().multiplyScalar(delta),
        ),
      }
    }
    case 'line-vertex': {
      const lineA = asMateLineRef(input.entityA)
      const vertexB = asMateVertexRef(input.entityB)
      if (lineA && vertexB) {
        return projectLineVertex({ ...input, lineA, vertexB })
      }
      if (!lineA) return { ok: false, reason: 'invalidGeometry' }
      const lineFrame = mateLineWorldFrame(input.geometryA, input.transformA, lineA)
      const pointFrame = resolvePointFrame(input.entityB, input.geometryB, input.transformB)
      if (!lineFrame || !pointFrame) return { ok: false, reason: 'invalidGeometry' }
      const target = pointOnCylinderAroundLine(
        pointFrame.point,
        lineFrame.point,
        lineFrame.direction,
        input.offsetMm,
      )
      return {
        ok: true,
        transform: translateTransform(input.transformB, target.sub(pointFrame.point)),
      }
    }
    case 'vertex-line': {
      const vertexA = asMateVertexRef(input.entityA)
      const lineB = asMateLineRef(input.entityB)
      if (vertexA && lineB) {
        return projectVertexLine({ ...input, vertexA, lineB })
      }
      if (!lineB) return { ok: false, reason: 'invalidGeometry' }
      const pointFrame = resolvePointFrame(input.entityA, input.geometryA, input.transformA)
      const lineFrame = mateLineWorldFrame(input.geometryB, input.transformB, lineB)
      if (!pointFrame || !lineFrame) return { ok: false, reason: 'invalidGeometry' }
      const target = pointOnCylinderAroundLine(
        pointFrame.point,
        lineFrame.point,
        lineFrame.direction,
        input.offsetMm,
      )
      const { closest } = pointLineDistance(
        pointFrame.point,
        lineFrame.point,
        lineFrame.direction,
      )
      return {
        ok: true,
        transform: translateTransform(input.transformB, target.sub(closest)),
      }
    }
    case 'plane-line': {
      const planeA = asMatePlaneRef(input.entityA)
      const lineB = asMateLineRef(input.entityB)
      if (!planeA || !lineB) return { ok: false, reason: 'invalidGeometry' }
      return projectPlaneLine({ ...input, planeA, lineB })
    }
    case 'line-plane': {
      const lineA = asMateLineRef(input.entityA)
      const planeB = asMatePlaneRef(input.entityB)
      if (!lineA || !planeB) return { ok: false, reason: 'invalidGeometry' }
      return projectLinePlane({ ...input, lineA, planeB })
    }
    default:
      return { ok: false, reason: 'unsupportedPair' }
  }
}
