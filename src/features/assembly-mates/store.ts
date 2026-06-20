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

export function validateParallelMateDraft(
  draft: ParallelMateDraft,
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
  return { ok: true }
}

export function parallelMateFromDraft(draft: ParallelMateDraft): ParallelMate | null {
  const valid = validateParallelMateDraft(draft)
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
