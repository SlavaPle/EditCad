import type { MateDraftSession } from './mateDraft'
import type { MatesPickSlot } from './matesPickMode'

export type MatesPickFlowStep = MatesPickSlot | 'apply'

/** Pierwszy krok po otwarciu okna (draft idle, brak elementów). */
export function initialMatesPickSlot(session: MateDraftSession): MatesPickSlot | null {
  if (session.applyState === 'applied') return null
  if (!session.draft.entityA) return 'entityA'
  if (!session.draft.entityB) return 'entityB'
  return null
}

/** Kolejny krok po udanym wyborze elementu w slocie (pierwszy przebieg A→B→apply). */
export function nextMatesPickFlowStep(pickedSlot: MatesPickSlot): MatesPickFlowStep {
  return pickedSlot === 'entityA' ? 'entityB' : 'apply'
}

/**
 * Slot po ustawieniu encji — przy przewyborze (druga encja już jest) nie wracaj do drugiego picka.
 * null = oba wypełnione, tryb apply / brak aktywnego picka.
 */
export function matesPickSlotAfterEntitySet(
  draft: Pick<MateDraftSession['draft'], 'entityA' | 'entityB'>,
  pickedSlot: MatesPickSlot,
): MatesPickSlot | null {
  if (draft.entityA && draft.entityB) return null
  if (pickedSlot === 'entityA' && !draft.entityB) return 'entityB'
  if (pickedSlot === 'entityB' && !draft.entityA) return 'entityA'
  return null
}

/**
 * Gdy popup otwarty i brak aktywnego slotu, a obie encje zajęte — przewybór po partId kliku.
 */
export function inferMatesReselectSlot(input: {
  partId: string
  entityAPartId: string | null | undefined
  entityBPartId: string | null | undefined
}): MatesPickSlot | null {
  const { partId, entityAPartId, entityBPartId } = input
  if (entityAPartId && entityAPartId === partId) return 'entityA'
  if (entityBPartId && entityBPartId === partId) return 'entityB'
  return null
}
