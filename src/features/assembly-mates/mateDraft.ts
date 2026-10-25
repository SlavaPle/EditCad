import type { PhantomTransform } from '../pre-assembly/model'
import type { AssemblyMate } from './model'
import {
  createEmptyMateDraft,
  createEmptyParallelMateDraft,
  mateDraftWithKind,
  mateFromDraft,
  type MateDraft,
  type ParallelMateDraft,
} from './store'
import { mateKindAvailableForEntities, type MateEntityRef, type MateKind } from './model'

export type MateDraftApplyState = 'idle' | 'applied'

export type MateDraftSession = {
  draft: MateDraft
  applyState: MateDraftApplyState
  /** Transform detalu B przed Apply (do Revert). */
  revertTransform: PhantomTransform | null
  movingPartId: string | null
}

export function createMateDraftSession(kind: MateKind = 'parallel'): MateDraftSession {
  return {
    draft: createEmptyMateDraft(kind),
    applyState: 'idle',
    revertTransform: null,
    movingPartId: null,
  }
}

export type MateDraftApplyResult =
  | { ok: true; session: MateDraftSession }
  | { ok: false; reason: 'notReady' | 'alreadyApplied' }

export function mateDraftApply(
  session: MateDraftSession,
  revertTransform: PhantomTransform,
): MateDraftApplyResult {
  if (session.applyState === 'applied') {
    return { ok: false, reason: 'alreadyApplied' }
  }
  if (!session.draft.entityA || !session.draft.entityB) {
    return { ok: false, reason: 'notReady' }
  }
  return {
    ok: true,
    session: {
      ...session,
      applyState: 'applied',
      revertTransform,
      movingPartId: session.draft.entityB.partId,
    },
  }
}

export type MateDraftRevertResult =
  | { ok: true; session: MateDraftSession; transform: PhantomTransform }
  | { ok: false; reason: 'notApplied' }

export function mateDraftRevert(session: MateDraftSession): MateDraftRevertResult {
  if (session.applyState !== 'applied' || !session.revertTransform) {
    return { ok: false, reason: 'notApplied' }
  }
  const transform = session.revertTransform
  return {
    ok: true,
    session: {
      ...session,
      applyState: 'idle',
      revertTransform: null,
      movingPartId: null,
    },
    transform,
  }
}

export type MateDraftSaveResult =
  | { ok: true; session: MateDraftSession; mate: AssemblyMate; mates: AssemblyMate[] }
  | { ok: false; reason: 'notApplied' | 'invalidDraft' }

export function mateDraftSave(
  session: MateDraftSession,
  existingMates: readonly AssemblyMate[],
): MateDraftSaveResult {
  if (session.applyState !== 'applied') {
    return { ok: false, reason: 'notApplied' }
  }
  const mate = mateFromDraft(session.draft, existingMates)
  if (!mate) {
    return { ok: false, reason: 'invalidDraft' }
  }
  return {
    ok: true,
    session: createMateDraftSession(session.draft.kind),
    mate,
    mates: [...existingMates, mate],
  }
}

type LivePatchKeys = 'alignment' | 'offsetMm' | 'flipped' | 'angleDeg'

export type MateDraftPatch = {
  kind?: MateKind
  entityA?: MateDraft['entityA']
  entityB?: MateDraft['entityB']
  flipped?: boolean
  alignment?: ParallelMateDraft['alignment']
  offsetMm?: number
  angleDeg?: number
}

function coerceMateDraftKindForEntities(session: MateDraftSession): MateDraftSession {
  if (
    mateKindAvailableForEntities(
      session.draft.kind,
      session.draft.entityA,
      session.draft.entityB,
    )
  ) {
    return session
  }
  return {
    ...session,
    draft: mateDraftWithKind(session.draft, 'parallel'),
  }
}

export function mateDraftUpdateDraft(
  session: MateDraftSession,
  patch: MateDraftPatch,
): MateDraftSession {
  if (patch.kind !== undefined && patch.kind !== session.draft.kind) {
    // Wierzchołek: tylko parallel — ignoruj niedozwolony kind
    if (
      !mateKindAvailableForEntities(patch.kind, session.draft.entityA, session.draft.entityB)
    ) {
      return session
    }
    // Pozwalaj zmieniać typ także w trakcie pick / live preview
    return {
      ...session,
      draft: mateDraftWithKind(session.draft, patch.kind),
    }
  }

  if (session.applyState === 'applied') {
    const livePatch: Partial<Record<LivePatchKeys | 'entityA' | 'entityB', unknown>> = {}
    if (patch.entityA !== undefined) livePatch.entityA = patch.entityA
    if (patch.entityB !== undefined) livePatch.entityB = patch.entityB
    if (
      patch.alignment !== undefined &&
      (session.draft.kind === 'parallel' || session.draft.kind === 'angular')
    ) {
      livePatch.alignment = patch.alignment
    }
    if (patch.offsetMm !== undefined && session.draft.kind === 'parallel') {
      livePatch.offsetMm = patch.offsetMm
    }
    if (patch.flipped !== undefined && session.draft.kind !== 'angular') {
      livePatch.flipped = patch.flipped
    }
    if (patch.angleDeg !== undefined && session.draft.kind === 'angular') {
      livePatch.angleDeg = patch.angleDeg
    }
    if (Object.keys(livePatch).length === 0) return session
    return coerceMateDraftKindForEntities({
      ...session,
      draft: {
        ...session.draft,
        ...livePatch,
      } as MateDraft,
    })
  }
  return coerceMateDraftKindForEntities({
    ...session,
    draft: {
      ...session.draft,
      ...patch,
    } as MateDraft,
  })
}

export function mateDraftSetEntity(
  session: MateDraftSession,
  slot: 'entityA' | 'entityB',
  entity: MateEntityRef | null,
): MateDraftSession {
  // Przewybór geometrii dozwolony także po live preview
  return mateDraftUpdateDraft(session, { [slot]: entity })
}

/** @deprecated Użyj mateDraftSetEntity */
export function mateDraftSetPlane(
  session: MateDraftSession,
  slot: 'entityA' | 'entityB' | 'planeA' | 'planeB',
  entity: MateEntityRef | null,
): MateDraftSession {
  const key = slot === 'planeA' ? 'entityA' : slot === 'planeB' ? 'entityB' : slot
  return mateDraftSetEntity(session, key, entity)
}

export function mateDraftHasUnsavedApply(session: MateDraftSession): boolean {
  return session.applyState === 'applied'
}

/** @deprecated Prefer createEmptyMateDraft */
export { createEmptyParallelMateDraft }
