import type { AssemblyMate, MateDraftValidationReason, ParallelMate } from './model'
import { createParallelMateId, validateAssemblyMate } from './model'

export type ParallelMateDraft = {
  kind: 'parallel'
  planeA: ParallelMate['planeA'] | null
  planeB: ParallelMate['planeB'] | null
  alignment: ParallelMate['alignment']
  offsetMm: number
}

export function createEmptyParallelMateDraft(): ParallelMateDraft {
  return {
    kind: 'parallel',
    planeA: null,
    planeB: null,
    alignment: 'faceToFace',
    offsetMm: 0,
  }
}

function parallelMatePartPairKey(partAId: string, partBId: string): string {
  return partAId < partBId ? `${partAId}\0${partBId}` : `${partBId}\0${partAId}`
}

/** Czy nowy parallel mate koliduje z już zapisanymi przywiązkami. */
export function parallelMateConflictsWithExisting(
  planeA: ParallelMate['planeA'],
  planeB: ParallelMate['planeB'],
  existingMates: readonly AssemblyMate[],
): boolean {
  const anchorId = planeA.partId
  const drivenId = planeB.partId
  const pairKey = parallelMatePartPairKey(anchorId, drivenId)

  for (const mate of existingMates) {
    if (mate.kind !== 'parallel') continue
    const existingAnchor = mate.planeA.partId
    const existingDriven = mate.planeB.partId

    if (parallelMatePartPairKey(existingAnchor, existingDriven) === pairKey) {
      return true
    }
    if (drivenId === existingDriven) {
      return true
    }
  }

  return false
}

export function validateParallelMateDraft(
  draft: ParallelMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): { ok: true } | { ok: false; reason: MateDraftValidationReason } {
  if (!draft.planeA || !draft.planeB) {
    return { ok: false, reason: 'missingPlane' }
  }
  if (draft.planeA.partId === draft.planeB.partId) {
    return { ok: false, reason: 'samePart' }
  }
  if (!Number.isFinite(draft.offsetMm)) {
    return { ok: false, reason: 'invalidOffset' }
  }
  if (parallelMateConflictsWithExisting(draft.planeA, draft.planeB, existingMates)) {
    return { ok: false, reason: 'conflictsWithExisting' }
  }
  return { ok: true }
}

export function parallelMateFromDraft(
  draft: ParallelMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): ParallelMate | null {
  const valid = validateParallelMateDraft(draft, existingMates)
  if (!valid.ok || !draft.planeA || !draft.planeB) return null
  return {
    id: createParallelMateId(),
    kind: 'parallel',
    planeA: draft.planeA,
    planeB: draft.planeB,
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
