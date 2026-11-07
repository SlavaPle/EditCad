import type {
  AngularMate,
  AssemblyMate,
  MateAlignment,
  MateDraftValidationReason,
  MateEntityRef,
  MateKind,
  ParallelMate,
  PerpendicularMate,
} from './model'
import {
  createMateId,
  isMateSuppressed,
  matePairKind,
  matePairSupportsOrient,
  validateAssemblyMate,
} from './model'
import { mateEntityPartId, mateEntityRefsMatch } from './mateEntityRef'

export type ParallelMateDraft = {
  kind: 'parallel'
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
  alignment: ParallelMate['alignment']
  offsetMm: number
  flipped: boolean
}

export type PerpendicularMateDraft = {
  kind: 'perpendicular'
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
  flipped: boolean
}

export type AngularMateDraft = {
  kind: 'angular'
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
  angleDeg: number
  alignment: MateAlignment
}

export type MateDraft = ParallelMateDraft | PerpendicularMateDraft | AngularMateDraft

export function createEmptyParallelMateDraft(): ParallelMateDraft {
  return {
    kind: 'parallel',
    entityA: null,
    entityB: null,
    alignment: 'faceToFace',
    offsetMm: 0,
    flipped: false,
  }
}

export function createEmptyPerpendicularMateDraft(): PerpendicularMateDraft {
  return {
    kind: 'perpendicular',
    entityA: null,
    entityB: null,
    flipped: false,
  }
}

export function createEmptyAngularMateDraft(): AngularMateDraft {
  return {
    kind: 'angular',
    entityA: null,
    entityB: null,
    angleDeg: 45,
    alignment: 'faceToFace',
  }
}

export function createEmptyMateDraft(kind: MateKind = 'parallel'): MateDraft {
  if (kind === 'perpendicular') return createEmptyPerpendicularMateDraft()
  if (kind === 'angular') return createEmptyAngularMateDraft()
  return createEmptyParallelMateDraft()
}

/** Zachowuje entityA/B przy zmianie rodzaju przywiązki. */
export function mateDraftWithKind(draft: MateDraft, kind: MateKind): MateDraft {
  const entityA = draft.entityA
  const entityB = draft.entityB
  const flipped =
    draft.kind === 'angular' ? draft.alignment === 'sameDirection' : draft.flipped
  const alignment: MateAlignment =
    draft.kind === 'angular'
      ? draft.alignment
      : draft.kind === 'parallel'
        ? draft.alignment
        : flipped
          ? 'sameDirection'
          : 'faceToFace'
  if (kind === 'parallel') {
    return {
      ...createEmptyParallelMateDraft(),
      entityA,
      entityB,
      flipped,
      alignment,
    }
  }
  if (kind === 'perpendicular') {
    return {
      ...createEmptyPerpendicularMateDraft(),
      entityA,
      entityB,
      flipped,
    }
  }
  return {
    ...createEmptyAngularMateDraft(),
    entityA,
    entityB,
    alignment,
    angleDeg: draft.kind === 'angular' ? draft.angleDeg : 45,
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

/**
 * Pełny duplikat pary encji (kolejność slotów nieważna).
 * Współdzielenie jednej płaszczyzny z innym drugim elementem — dozwolone.
 */
function mateEntityPairIsDuplicate(
  entityA: MateEntityRef,
  entityB: MateEntityRef,
  mate: AssemblyMate,
): boolean {
  return (
    (mateEntityRefsMatch(entityA, mate.entityA) && mateEntityRefsMatch(entityB, mate.entityB)) ||
    (mateEntityRefsMatch(entityA, mate.entityB) && mateEntityRefsMatch(entityB, mate.entityA))
  )
}

/** Czy nowa przywiązka jest dokładnym duplikatem już zapisanej na tej samej parze detali. */
export function mateConflictsWithExisting(
  entityA: MateEntityRef,
  entityB: MateEntityRef,
  existingMates: readonly AssemblyMate[],
): boolean {
  for (const mate of existingMates) {
    if (isMateSuppressed(mate)) continue
    if (!sameMatePartPair(entityA, entityB, mate)) continue
    if (mateEntityPairIsDuplicate(entityA, entityB, mate)) {
      return true
    }
  }
  return false
}

/** @deprecated Użyj mateConflictsWithExisting */
export function parallelMateConflictsWithExisting(
  entityA: MateEntityRef,
  entityB: MateEntityRef,
  existingMates: readonly AssemblyMate[],
): boolean {
  return mateConflictsWithExisting(entityA, entityB, existingMates)
}

function validateOrientEntities(
  entityA: MateEntityRef,
  entityB: MateEntityRef,
): MateDraftValidationReason | null {
  if (mateEntityPartId(entityA) === mateEntityPartId(entityB)) return 'samePart'
  if (!matePairSupportsOrient(matePairKind(entityA, entityB))) return 'unsupportedPair'
  return null
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
  if (!Number.isFinite(draft.offsetMm) || draft.offsetMm < 0) {
    return { ok: false, reason: 'invalidOffset' }
  }
  if (mateConflictsWithExisting(draft.entityA, draft.entityB, existingMates)) {
    return { ok: false, reason: 'conflictsWithExisting' }
  }
  return { ok: true }
}

export function validatePerpendicularMateDraft(
  draft: PerpendicularMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): { ok: true } | { ok: false; reason: MateDraftValidationReason } {
  if (!draft.entityA || !draft.entityB) {
    return { ok: false, reason: 'missingEntity' }
  }
  const pairReason = validateOrientEntities(draft.entityA, draft.entityB)
  if (pairReason) return { ok: false, reason: pairReason }
  if (mateConflictsWithExisting(draft.entityA, draft.entityB, existingMates)) {
    return { ok: false, reason: 'conflictsWithExisting' }
  }
  return { ok: true }
}

export function validateAngularMateDraft(
  draft: AngularMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): { ok: true } | { ok: false; reason: MateDraftValidationReason } {
  if (!draft.entityA || !draft.entityB) {
    return { ok: false, reason: 'missingEntity' }
  }
  const pairReason = validateOrientEntities(draft.entityA, draft.entityB)
  if (pairReason) return { ok: false, reason: pairReason }
  if (!Number.isFinite(draft.angleDeg)) {
    return { ok: false, reason: 'invalidAngle' }
  }
  if (mateConflictsWithExisting(draft.entityA, draft.entityB, existingMates)) {
    return { ok: false, reason: 'conflictsWithExisting' }
  }
  return { ok: true }
}

export function validateMateDraft(
  draft: MateDraft,
  existingMates: readonly AssemblyMate[] = [],
): { ok: true } | { ok: false; reason: MateDraftValidationReason } {
  if (draft.kind === 'parallel') return validateParallelMateDraft(draft, existingMates)
  if (draft.kind === 'perpendicular') return validatePerpendicularMateDraft(draft, existingMates)
  return validateAngularMateDraft(draft, existingMates)
}

export function parallelMateFromDraft(
  draft: ParallelMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): ParallelMate | null {
  const valid = validateParallelMateDraft(draft, existingMates)
  if (!valid.ok || !draft.entityA || !draft.entityB) return null
  const mate: ParallelMate = {
    id: createMateId(),
    kind: 'parallel',
    entityA: draft.entityA,
    entityB: draft.entityB,
    alignment: draft.alignment,
    offsetMm: Math.abs(draft.offsetMm),
  }
  if (draft.flipped) mate.flipped = true
  return mate
}

export function perpendicularMateFromDraft(
  draft: PerpendicularMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): PerpendicularMate | null {
  const valid = validatePerpendicularMateDraft(draft, existingMates)
  if (!valid.ok || !draft.entityA || !draft.entityB) return null
  return {
    id: createMateId(),
    kind: 'perpendicular',
    entityA: draft.entityA,
    entityB: draft.entityB,
    flipped: draft.flipped,
  }
}

export function angularMateFromDraft(
  draft: AngularMateDraft,
  existingMates: readonly AssemblyMate[] = [],
): AngularMate | null {
  const valid = validateAngularMateDraft(draft, existingMates)
  if (!valid.ok || !draft.entityA || !draft.entityB) return null
  return {
    id: createMateId(),
    kind: 'angular',
    entityA: draft.entityA,
    entityB: draft.entityB,
    angleDeg: draft.angleDeg,
    alignment: draft.alignment,
  }
}

export function mateFromDraft(
  draft: MateDraft,
  existingMates: readonly AssemblyMate[] = [],
): AssemblyMate | null {
  if (draft.kind === 'parallel') return parallelMateFromDraft(draft, existingMates)
  if (draft.kind === 'perpendicular') return perpendicularMateFromDraft(draft, existingMates)
  return angularMateFromDraft(draft, existingMates)
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

export function setAssemblyMateSuppressed(
  list: readonly AssemblyMate[],
  id: string,
  suppressed: boolean,
): AssemblyMate[] {
  return list.map((mate) => {
    if (mate.id !== id) return mate
    if (suppressed) {
      return { ...mate, suppressed: true }
    }
    const { suppressed: _drop, ...rest } = mate
    return rest as AssemblyMate
  })
}

export function toggleAssemblyMateSuppressed(
  list: readonly AssemblyMate[],
  id: string,
): AssemblyMate[] {
  const current = list.find((mate) => mate.id === id)
  if (!current) return [...list]
  return setAssemblyMateSuppressed(list, id, !isMateSuppressed(current))
}

export function isDraftEntityReady(ref: MateEntityRef | null): boolean {
  return ref !== null
}

/** @deprecated Użyj draft.entityA / entityB */
export function draftEntityA(draft: MateDraft): MateEntityRef | null {
  return draft.entityA
}

/** @deprecated Użyj draft.entityB */
export function draftEntityB(draft: MateDraft): MateEntityRef | null {
  return draft.entityB
}

export { matePairKind }
