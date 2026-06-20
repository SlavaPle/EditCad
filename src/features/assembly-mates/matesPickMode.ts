export type MatesPickSlot = 'planeA' | 'planeB'

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
