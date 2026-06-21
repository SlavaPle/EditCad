import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateAlignment, MateEntityRef } from '../model'
import { matePairKind } from '../model'
import { asMateLineRef, asMatePlaneRef, asMateVertexRef } from '../mateEntityRef'
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

/** Minimalna korekta transformB na mnożestwie ograniczenia. */
export function projectMateConstraint(input: MateProjectInput): MateProjectResult {
  const pair = matePairKind(input.entityA, input.entityB)

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
      if (!vertexA || !vertexB) return { ok: false, reason: 'invalidGeometry' }
      return projectVertexVertex({ ...input, vertexA, vertexB })
    }
    case 'plane-vertex': {
      const planeA = asMatePlaneRef(input.entityA)
      const vertexB = asMateVertexRef(input.entityB)
      if (!planeA || !vertexB) return { ok: false, reason: 'invalidGeometry' }
      return projectPlaneVertex({ ...input, planeA, vertexB })
    }
    case 'vertex-plane': {
      const vertexA = asMateVertexRef(input.entityA)
      const planeB = asMatePlaneRef(input.entityB)
      if (!vertexA || !planeB) return { ok: false, reason: 'invalidGeometry' }
      return projectVertexPlane({ ...input, vertexA, planeB })
    }
    case 'line-vertex': {
      const lineA = asMateLineRef(input.entityA)
      const vertexB = asMateVertexRef(input.entityB)
      if (!lineA || !vertexB) return { ok: false, reason: 'invalidGeometry' }
      return projectLineVertex({ ...input, lineA, vertexB })
    }
    case 'vertex-line': {
      const vertexA = asMateVertexRef(input.entityA)
      const lineB = asMateLineRef(input.entityB)
      if (!vertexA || !lineB) return { ok: false, reason: 'invalidGeometry' }
      return projectVertexLine({ ...input, vertexA, lineB })
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
