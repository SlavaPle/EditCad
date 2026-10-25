import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../../pre-assembly/model'
import type { MateEntityRef, MateKind } from '../model'
import { matePairKind, matePairSupportsOrient } from '../model'
import { asMateLineRef, asMatePlaneRef } from '../mateEntityRef'
import { projectOrientPlanePlane } from './projectOrientPlanePlane'
import { projectOrientLineLine } from './projectOrientLineLine'
import { projectOrientPlaneLine, projectOrientLinePlane } from './projectOrientLinePlane'

export type OrientMateProjectReason = 'invalidGeometry' | 'unsupportedPair'

export type OrientMateProjectInput = {
  kind: Extract<MateKind, 'perpendicular' | 'angular'>
  entityA: MateEntityRef
  entityB: MateEntityRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  flipped: boolean
  /** Wymagane dla angular; dla perpendicular pomijane (90° / 0° plane-line). */
  angleDeg?: number
}

export type OrientMateProjectResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: OrientMateProjectReason }

const DEG_TO_RAD = Math.PI / 180

/** Kąt docelowy (rad) między wektorami orientacji pary. */
export function orientTargetAngleRad(
  kind: OrientMateProjectInput['kind'],
  pair: ReturnType<typeof matePairKind>,
  angleDeg: number | undefined,
): number | null {
  if (kind === 'perpendicular') {
    // plane-line: linia ⊥ płaszczyźnie ⇒ dir ∥ normal ⇒ kąt 0
    if (pair === 'plane-line' || pair === 'line-plane') return 0
    return Math.PI / 2
  }
  if (angleDeg === undefined || !Number.isFinite(angleDeg)) return null
  return angleDeg * DEG_TO_RAD
}

/** Minimalna korekta transformB — tylko orientacja (bez offsetu). */
export function projectOrientMateConstraint(input: OrientMateProjectInput): OrientMateProjectResult {
  const pair = matePairKind(input.entityA, input.entityB)
  if (!matePairSupportsOrient(pair)) {
    return { ok: false, reason: 'unsupportedPair' }
  }

  const angleRad = orientTargetAngleRad(input.kind, pair, input.angleDeg)
  if (angleRad === null) {
    return { ok: false, reason: 'unsupportedPair' }
  }

  const common = {
    geometryA: input.geometryA,
    geometryB: input.geometryB,
    transformA: input.transformA,
    transformB: input.transformB,
    angleRad,
    flipped: input.flipped,
  }

  switch (pair) {
    case 'plane-plane': {
      const planeA = asMatePlaneRef(input.entityA)
      const planeB = asMatePlaneRef(input.entityB)
      if (!planeA || !planeB) return { ok: false, reason: 'invalidGeometry' }
      return projectOrientPlanePlane({ ...common, planeA, planeB })
    }
    case 'line-line': {
      const lineA = asMateLineRef(input.entityA)
      const lineB = asMateLineRef(input.entityB)
      if (!lineA || !lineB) return { ok: false, reason: 'invalidGeometry' }
      return projectOrientLineLine({ ...common, lineA, lineB })
    }
    case 'plane-line': {
      const planeA = asMatePlaneRef(input.entityA)
      const lineB = asMateLineRef(input.entityB)
      if (!planeA || !lineB) return { ok: false, reason: 'invalidGeometry' }
      return projectOrientPlaneLine({ ...common, planeA, lineB })
    }
    case 'line-plane': {
      const lineA = asMateLineRef(input.entityA)
      const planeB = asMatePlaneRef(input.entityB)
      if (!lineA || !planeB) return { ok: false, reason: 'invalidGeometry' }
      return projectOrientLinePlane({ ...common, lineA, planeB })
    }
    default:
      return { ok: false, reason: 'unsupportedPair' }
  }
}
