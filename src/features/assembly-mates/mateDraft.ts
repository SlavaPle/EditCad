import type { PhantomTransform } from '../pre-assembly/model'
import type { AssemblyMate, ParallelMate } from './model'
import { createEmptyParallelMateDraft, parallelMateFromDraft, type ParallelMateDraft } from './store'
import type { MateEntityRef } from './model'

export type MateDraftApplyState = 'idle' | 'applied'

export type MateDraftSession = {
  draft: ParallelMateDraft
  applyState: MateDraftApplyState
  /** Transform detalu B przed Apply (do Revert). */
  revertTransform: PhantomTransform | null
  movingPartId: string | null
}

export function createMateDraftSession(): MateDraftSession {
  return {
    draft: createEmptyParallelMateDraft(),
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
  | { ok: true; session: MateDraftSession; mate: ParallelMate; mates: AssemblyMate[] }
  | { ok: false; reason: 'notApplied' | 'invalidDraft' }

export function mateDraftSave(
  session: MateDraftSession,
  existingMates: readonly AssemblyMate[],
): MateDraftSaveResult {
  if (session.applyState !== 'applied') {
    return { ok: false, reason: 'notApplied' }
  }
  const mate = parallelMateFromDraft(session.draft, existingMates)
  if (!mate) {
    return { ok: false, reason: 'invalidDraft' }
  }
  return {
    ok: true,
    session: createMateDraftSession(),
    mate,
    mates: [...existingMates, mate],
  }
}

export function mateDraftUpdateDraft(
  session: MateDraftSession,
  patch: Partial<ParallelMateDraft>,
): MateDraftSession {
  if (session.applyState === 'applied') {
    const livePatch: Partial<ParallelMateDraft> = {}
    if (patch.alignment !== undefined) livePatch.alignment = patch.alignment
    if (patch.offsetMm !== undefined) livePatch.offsetMm = patch.offsetMm
    if (Object.keys(livePatch).length === 0) return session
    return {
      ...session,
      draft: {
        ...session.draft,
        ...livePatch,
      },
    }
  }
  return {
    ...session,
    draft: {
      ...session.draft,
      ...patch,
    },
  }
}

export function mateDraftSetEntity(
  session: MateDraftSession,
  slot: 'entityA' | 'entityB',
  entity: MateEntityRef | null,
): MateDraftSession {
  if (session.applyState === 'applied') return session
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
