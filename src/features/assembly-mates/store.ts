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

function matePlaneRefsMatch(a: ParallelMate['planeA'], b: ParallelMate['planeA']): boolean {
  if (a.partId !== b.partId || a.faceIndex !== b.faceIndex) return false
  if (a.faceIndices.length !== b.faceIndices.length) return false
  return a.faceIndices.every((face, index) => face === b.faceIndices[index])
}

function sameMatePartPair(
  planeA: ParallelMate['planeA'],
  planeB: ParallelMate['planeB'],
  mate: AssemblyMate,
): boolean {
  const partIds = new Set([planeA.partId, planeB.partId])
  return partIds.has(mate.planeA.partId) && partIds.has(mate.planeB.partId)
}

/** Czy nowy mate używa tej samej płaszczyzny co już zapisany (niezależnie od roli A/B). */
function parallelMatePlaneRefsOverlap(
  planeA: ParallelMate['planeA'],
  planeB: ParallelMate['planeB'],
  mate: AssemblyMate,
): boolean {
  const refs = [planeA, planeB]
  const existingRefs = [mate.planeA, mate.planeB]
  return refs.some((ref) =>
    existingRefs.some((existing) => matePlaneRefsMatch(ref, existing)),
  )
}

/** Czy nowy parallel mate koliduje z już zapisaną przywiązką tej samej pary detali. */
export function parallelMateConflictsWithExisting(
  planeA: ParallelMate['planeA'],
  planeB: ParallelMate['planeB'],
  existingMates: readonly AssemblyMate[],
): boolean {
  for (const mate of existingMates) {
    if (mate.kind !== 'parallel') continue
    if (!sameMatePartPair(planeA, planeB, mate)) continue
    if (parallelMatePlaneRefsOverlap(planeA, planeB, mate)) {
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
