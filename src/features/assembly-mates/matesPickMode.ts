export type MatesPickSlot = 'entityA' | 'entityB'

export type MatesPickMode = {
  active: boolean
  slot: MatesPickSlot | null
}

export const INACTIVE_MATES_PICK_MODE: MatesPickMode = {
  active: false,
  slot: null,
}

export function matesPickModeForSlot(slot: MatesPickSlot | null): MatesPickMode {
  return slot ? { active: true, slot } : INACTIVE_MATES_PICK_MODE
}

/** @deprecated Użyj entityA / entityB */
export type LegacyMatesPickSlot = 'planeA' | 'planeB'

export function legacySlotToEntitySlot(slot: LegacyMatesPickSlot | MatesPickSlot): MatesPickSlot {
  if (slot === 'planeA') return 'entityA'
  if (slot === 'planeB') return 'entityB'
  return slot
}
