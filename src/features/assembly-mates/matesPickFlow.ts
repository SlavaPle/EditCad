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

/** Kolejny krok po udanym wyborze elementu w slocie. */
export function nextMatesPickFlowStep(pickedSlot: MatesPickSlot): MatesPickFlowStep {
  return pickedSlot === 'entityA' ? 'entityB' : 'apply'
}
