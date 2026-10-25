import type { BufferGeometry } from 'three'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { mateDraftApply, type MateDraftSession } from './mateDraft'
import type { AssemblyMate, MateDraftValidationReason } from './model'
import { signedMateOffsetMm } from './model'
import { projectMateConstraint, type MateProjectReason } from './constraint/projectMateConstraint'
import {
  projectOrientMateConstraint,
  type OrientMateProjectReason,
} from './constraint/projectOrientMateConstraint'
import { validateMateDraft, type MateDraft } from './store'

export type ExecuteMateApplyInput = {
  session: MateDraftSession
  draft: MateDraft
  existingMates?: readonly AssemblyMate[]
  programParts: readonly PreAssemblyProgramPart[]
  programPartGeometries: Readonly<Record<string, BufferGeometry>>
}

export type ExecuteMateApplyReason =
  | 'notIdle'
  | 'invalidDraft'
  | 'missingGeometry'
  | 'missingPart'
  | 'solverFailed'
  | 'applyFailed'

export type ExecuteMateApplyResult =
  | {
      ok: true
      nextSession: MateDraftSession
      movingPartId: string
      transform: PreAssemblyProgramPart['transform']
    }
  | {
      ok: false
      reason: ExecuteMateApplyReason
      validationReason?: MateDraftValidationReason
      solverReason?: MateProjectReason | OrientMateProjectReason
    }

export function executeMateApply(input: ExecuteMateApplyInput): ExecuteMateApplyResult {
  const { session, draft, programParts, programPartGeometries } = input

  const validation = validateMateDraft(draft, input.existingMates ?? [])
  if (!validation.ok) {
    return { ok: false, reason: 'invalidDraft', validationReason: validation.reason }
  }

  const { entityA, entityB } = draft
  if (!entityA || !entityB) {
    return { ok: false, reason: 'invalidDraft' }
  }

  const geometryA = programPartGeometries[entityA.partId]
  const geometryB = programPartGeometries[entityB.partId]
  if (!geometryA || !geometryB) {
    return { ok: false, reason: 'missingGeometry' }
  }

  const partA = programParts.find((p) => p.id === entityA.partId)
  const partB = programParts.find((p) => p.id === entityB.partId)
  if (!partA || !partB) {
    return { ok: false, reason: 'missingPart' }
  }

  let projected:
    | { ok: true; transform: PreAssemblyProgramPart['transform'] }
    | { ok: false; reason: MateProjectReason | OrientMateProjectReason }

  if (draft.kind === 'parallel') {
    projected = projectMateConstraint({
      entityA,
      entityB,
      geometryA,
      geometryB,
      transformA: partA.transform,
      transformB: partB.transform,
      alignment: draft.alignment,
      offsetMm: signedMateOffsetMm(draft.offsetMm, draft.flipped),
    })
  } else {
    projected = projectOrientMateConstraint({
      kind: draft.kind,
      entityA,
      entityB,
      geometryA,
      geometryB,
      transformA: partA.transform,
      transformB: partB.transform,
      flipped: draft.flipped,
      angleDeg: draft.kind === 'angular' ? draft.angleDeg : undefined,
    })
  }

  if (!projected.ok) {
    return { ok: false, reason: 'solverFailed', solverReason: projected.reason }
  }

  if (session.applyState === 'idle') {
    const applied = mateDraftApply({ ...session, draft }, partB.transform)
    if (!applied.ok) {
      return { ok: false, reason: 'applyFailed' }
    }
    return {
      ok: true,
      nextSession: applied.session,
      movingPartId: entityB.partId,
      transform: projected.transform,
    }
  }

  return {
    ok: true,
    nextSession: { ...session, draft },
    movingPartId: entityB.partId,
    transform: projected.transform,
  }
}
