import type { AssemblyMate, MateDraftValidationReason, MateEntityRef, ParallelMate } from './model'
import { createParallelMateId, matePairKind, validateAssemblyMate } from './model'
import {
  mateEntityPartId,
  mateEntityRefsMatch,
} from './mateEntityRef'

export type ParallelMateDraft = {
  kind: 'parallel'
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
  alignment: ParallelMate['alignment']
  offsetMm: number
}

export function createEmptyParallelMateDraft(): ParallelMateDraft {
  return {
    kind: 'parallel',
    entityA: null,
    entityB: null,
    alignment: 'faceToFace',
    offsetMm: 0,
  }
}

function sameMatePartPair(
  entityA: MateEntityRef,
  entityB: MateEntityRef,
  mate: AssemblyMate,
): boolean {
  const partIds = new Set([entityA.partId, entityB.partId])
  return partIds.has(mate.entityA.partId) && partIds.has(mate.entityB.partId)
}

function parallelMateEntityRefsOverlap(
  entityA: MateEntityRef,
  entityB: MateEntityRef,
  mate: AssemblyMate,
): boolean {
  const refs = [entityA, entityB]
  const existingRefs = [mate.entityA, mate.entityB]
  return refs.some((ref) =>
    existingRefs.some((existing) => mateEntityRefsMatch(ref, existing)),
  )
}

/** Czy nowy parallel mate koliduje z już zapisaną przywiązką tej samej pary detali. */
export function parallelMateConflictsWithExisting(
  entityA: MateEntityRef,
  entityB: MateEntityRef,
  existingMates: readonly AssemblyMate[],
): boolean {
  for (const mate of existingMates) {
    if (mate.kind !== 'parallel') continue
    if (!sameMatePartPair(entityA, entityB, mate)) continue
    if (parallelMateEntityRefsOverlap(entityA, entityB, mate)) {
      return true
    }
  }

  return false
}

export function validateParallelMateDraft(
  draft: ParallelMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): { ok: true } | { ok: false; reason: MateDraftValidationReason } {
  if (!draft.entityA || !draft.entityB) {
    return { ok: false, reason: 'missingEntity' }
  }
  if (mateEntityPartId(draft.entityA) === mateEntityPartId(draft.entityB)) {
    return { ok: false, reason: 'samePart' }
  }
  if (!Number.isFinite(draft.offsetMm)) {
    return { ok: false, reason: 'invalidOffset' }
  }
  if (parallelMateConflictsWithExisting(draft.entityA, draft.entityB, existingMates)) {
    return { ok: false, reason: 'conflictsWithExisting' }
  }
  return { ok: true }
}

export function parallelMateFromDraft(
  draft: ParallelMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): ParallelMate | null {
  const valid = validateParallelMateDraft(draft, existingMates)
  if (!valid.ok || !draft.entityA || !draft.entityB) return null
  return {
    id: createParallelMateId(),
    kind: 'parallel',
    entityA: draft.entityA,
    entityB: draft.entityB,
    alignment: draft.alignment,
    offsetMm: draft.offsetMm,
  }
}

export function addAssemblyMate(
  list: readonly AssemblyMate[],
  mate: AssemblyMate,
): AssemblyMate[] {
  if (!validateAssemblyMate(mate)) return [...list]
  return [...list, mate]
}

export function removeAssemblyMate(list: readonly AssemblyMate[], id: string): AssemblyMate[] {
  return list.filter((item) => item.id !== id)
}

export function isDraftEntityReady(ref: MateEntityRef | null): boolean {
  return ref !== null
}

/** @deprecated Użyj draft.entityA / entityB */
export function draftEntityA(draft: ParallelMateDraft): MateEntityRef | null {
  return draft.entityA
}

/** @deprecated Użyj draft.entityB */
export function draftEntityB(draft: ParallelMateDraft): MateEntityRef | null {
  return draft.entityB
}

export { matePairKind }
