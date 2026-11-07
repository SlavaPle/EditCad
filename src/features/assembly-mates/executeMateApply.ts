import type { BufferGeometry } from 'three'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { mateDraftApply, type MateDraftSession } from './mateDraft'
import type { AssemblyMate, MateDraftValidationReason, MateEntityRef } from './model'
import { signedMateOffsetMm } from './model'
import { projectMateConstraint, type MateProjectReason } from './constraint/projectMateConstraint'
import {
  projectOrientMateConstraint,
  type OrientMateProjectReason,
} from './constraint/projectOrientMateConstraint'
import { applyAssemblyMateConstraints } from './applyAssemblyMateConstraints'
import { asMatePlaneRef } from './mateEntityRef'
import { matePlaneWorldFrame } from './planeWorldFrame'
import { validateMateDraft, type MateDraft } from './store'

export type ExecuteMateApplyInput = {
  session: MateDraftSession
  draft: MateDraft
  existingMates?: readonly AssemblyMate[]
  programParts: readonly PreAssemblyProgramPart[]
  programPartGeometries: Readonly<Record<string, BufferGeometry>>
  lockedPartIds?: ReadonlySet<string>
}

export type ExecuteMateApplyReason =
  | 'notIdle'
  | 'invalidDraft'
  | 'missingGeometry'
  | 'missingPart'
  | 'partLocked'
  | 'solverFailed'
  | 'applyFailed'
  /** Draft nie da się spełnić razem z już zapisanymi mates. */
  | 'inconsistentWithExisting'

const MATE_CONSISTENCY_EPS_MM = 0.05
const MATE_CONSISTENCY_EPS_DEG = 0.05

function transformsDiverge(
  a: PreAssemblyProgramPart['transform'],
  b: PreAssemblyProgramPart['transform'],
): boolean {
  for (let i = 0; i < 3; i++) {
    if (Math.abs(a.positionMm[i]! - b.positionMm[i]!) > MATE_CONSISTENCY_EPS_MM) return true
    if (Math.abs(a.rotationDeg[i]! - b.rotationDeg[i]!) > MATE_CONSISTENCY_EPS_DEG) return true
  }
  return false
}

export type ExecuteMateApplyResult =
  | {
      ok: true
      nextSession: MateDraftSession
      movingPartId: string
      transform: PreAssemblyProgramPart['transform']
      parts: PreAssemblyProgramPart[]
    }
  | {
      ok: false
      reason: ExecuteMateApplyReason
      validationReason?: MateDraftValidationReason
      solverReason?: MateProjectReason | OrientMateProjectReason
    }

/**
 * Solver rusza entityB. Gdy B zablokowane, a A wolne — zamień role.
 */
function resolveDrivenRoles(
  entityA: MateEntityRef,
  entityB: MateEntityRef,
  lockedPartIds: ReadonlySet<string> | undefined,
):
  | { ok: true; entityA: MateEntityRef; entityB: MateEntityRef; swapped: boolean }
  | { ok: false; reason: 'partLocked' } {
  const aLocked = lockedPartIds?.has(entityA.partId) ?? false
  const bLocked = lockedPartIds?.has(entityB.partId) ?? false
  if (aLocked && bLocked) return { ok: false, reason: 'partLocked' }
  if (bLocked && !aLocked) {
    return { ok: true, entityA: entityB, entityB: entityA, swapped: true }
  }
  return { ok: true, entityA, entityB, swapped: false }
}

function draftWithResolvedEntities(
  draft: MateDraft,
  entityA: MateEntityRef,
  entityB: MateEntityRef,
  swapped: boolean,
): MateDraft {
  if (!swapped) return { ...draft, entityA, entityB }
  if (draft.kind === 'parallel' || draft.kind === 'perpendicular') {
    return { ...draft, entityA, entityB, flipped: !draft.flipped }
  }
  return { ...draft, entityA, entityB }
}

function assemblyMateFromResolvedDraft(draft: MateDraft): AssemblyMate | null {
  if (!draft.entityA || !draft.entityB) return null
  if (draft.kind === 'parallel') {
    const mate: AssemblyMate = {
      id: '__mate-draft-preview__',
      kind: 'parallel',
      entityA: draft.entityA,
      entityB: draft.entityB,
      alignment: draft.alignment,
      offsetMm: Math.abs(draft.offsetMm),
    }
    if (draft.flipped) mate.flipped = true
    return mate
  }
  if (draft.kind === 'perpendicular') {
    return {
      id: '__mate-draft-preview__',
      kind: 'perpendicular',
      entityA: draft.entityA,
      entityB: draft.entityB,
      flipped: draft.flipped,
    }
  }
  return {
    id: '__mate-draft-preview__',
    kind: 'angular',
    entityA: draft.entityA,
    entityB: draft.entityB,
    angleDeg: draft.angleDeg,
    alignment: draft.alignment,
  }
}

function parallelResidualMm(
  mate: AssemblyMate,
  parts: readonly PreAssemblyProgramPart[],
  geometries: Readonly<Record<string, BufferGeometry>>,
): number | null {
  if (mate.kind !== 'parallel') return null
  const planeA = asMatePlaneRef(mate.entityA)
  const planeB = asMatePlaneRef(mate.entityB)
  if (!planeA || !planeB) return null
  const partA = parts.find((p) => p.id === planeA.partId)
  const partB = parts.find((p) => p.id === planeB.partId)
  const geoA = geometries[planeA.partId]
  const geoB = geometries[planeB.partId]
  if (!partA || !partB || !geoA || !geoB) return null
  const frameA = matePlaneWorldFrame(geoA, partA.transform, planeA.faceIndices)
  const frameB = matePlaneWorldFrame(geoB, partB.transform, planeB.faceIndices)
  if (!frameA || !frameB) return null
  const gap = frameB.point.clone().sub(frameA.point).dot(frameA.normal)
  return gap - signedMateOffsetMm(mate.offsetMm, mate.flipped)
}

export function executeMateApply(input: ExecuteMateApplyInput): ExecuteMateApplyResult {
  const { session, draft, programParts, programPartGeometries } = input

  const validation = validateMateDraft(draft, input.existingMates ?? [])
  if (!validation.ok) {
    return { ok: false, reason: 'invalidDraft', validationReason: validation.reason }
  }

  const { entityA: rawA, entityB: rawB } = draft
  if (!rawA || !rawB) {
    return { ok: false, reason: 'invalidDraft' }
  }

  const roles = resolveDrivenRoles(rawA, rawB, input.lockedPartIds)
  if (!roles.ok) {
    return { ok: false, reason: 'partLocked' }
  }

  const { entityA, entityB, swapped } = roles
  const resolvedDraft = draftWithResolvedEntities(draft, entityA, entityB, swapped)

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

  if (resolvedDraft.kind === 'parallel') {
    projected = projectMateConstraint({
      entityA,
      entityB,
      geometryA,
      geometryB,
      transformA: partA.transform,
      transformB: partB.transform,
      alignment: resolvedDraft.alignment,
      offsetMm: signedMateOffsetMm(resolvedDraft.offsetMm, resolvedDraft.flipped),
    })
  } else {
    projected = projectOrientMateConstraint({
      kind: resolvedDraft.kind,
      entityA,
      entityB,
      geometryA,
      geometryB,
      transformA: partA.transform,
      transformB: partB.transform,
      flipped: resolvedDraft.kind === 'perpendicular' ? resolvedDraft.flipped : false,
      alignment: resolvedDraft.kind === 'angular' ? resolvedDraft.alignment : undefined,
      angleDeg: resolvedDraft.kind === 'angular' ? resolvedDraft.angleDeg : undefined,
    })
  }

  if (!projected.ok) {
    return { ok: false, reason: 'solverFailed', solverReason: projected.reason }
  }

  const draftMate = assemblyMateFromResolvedDraft(resolvedDraft)
  const existingMates = input.existingMates ?? []
  // Draft jako seed ruchu, potem istniejące mates (na końcu listy mają priorytet przy konflikcie DOF).
  const matesForApply = draftMate ? [draftMate, ...existingMates] : existingMates
  const parts =
    matesForApply.length > 0
      ? applyAssemblyMateConstraints({
          parts: programParts,
          mates: matesForApply,
          geometries: programPartGeometries,
          movedPartId: entityB.partId,
          movedTransform: projected.transform,
          lockedPartIds: input.lockedPartIds,
        })
      : programParts.map((part) =>
          part.id === entityB.partId ? { ...part, transform: projected.transform } : part,
        )

  const movingPart = parts.find((p) => p.id === entityB.partId)
  const transform = movingPart?.transform ?? projected.transform
  const draftResidual = draftMate
    ? parallelResidualMm(draftMate, parts, programPartGeometries)
    : null
  const inconsistent =
    existingMates.length > 0 &&
    (transformsDiverge(projected.transform, transform) ||
      (draftResidual !== null && Math.abs(draftResidual) > MATE_CONSISTENCY_EPS_MM))


  if (inconsistent) {
    return { ok: false, reason: 'inconsistentWithExisting' }
  }

  if (session.applyState === 'idle') {
    const applied = mateDraftApply({ ...session, draft: resolvedDraft }, partB.transform)
    if (!applied.ok) {
      return { ok: false, reason: 'applyFailed' }
    }
    return {
      ok: true,
      nextSession: applied.session,
      movingPartId: entityB.partId,
      transform,
      parts,
    }
  }

  return {
    ok: true,
    nextSession: { ...session, draft: resolvedDraft },
    movingPartId: entityB.partId,
    transform,
    parts,
  }
}
