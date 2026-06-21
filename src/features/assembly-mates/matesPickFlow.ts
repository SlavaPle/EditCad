import type { MateDraftSession } from './mateDraft'
import type { MatesPickSlot } from './matesPickMode'

export type MatesPickFlowStep = MatesPickSlot | 'apply'

/** Pierwszy krok po otwarciu okna (draft idle, brak płaszczyzn). */
export function initialMatesPickSlot(session: MateDraftSession): MatesPickSlot | null {
  if (session.applyState === 'applied') return null
  if (!session.draft.planeA) return 'planeA'
  if (!session.draft.planeB) return 'planeB'
  return null
}

/** Kolejny krok po udanym wyborze płaszczyzny w slocie. */
export function nextMatesPickFlowStep(pickedSlot: MatesPickSlot): MatesPickFlowStep {
  return pickedSlot === 'planeA' ? 'planeB' : 'apply'
}
