import { createEmptySelection, type SelectionState } from '../../lib/selection'
import type { MateEntityHighlights } from '../assembly-mates/matePlaneFaceOverlay'
import type { PreAssemblyPanelSelection } from '../pre-assembly/panels/panelSelection'

/**
 * Globalna reguła EditCad: LKM w puste miejsce viewportu zawsze czyści
 * wszystkie zaznaczenia (mesh, aktywny detal, mates z drzewa, phantom, limit focus).
 */
export type ClearedViewportSelectionState = {
  selection: SelectionState
  probableFaces: readonly number[]
  activeProgramPartId: string | null
  treeMateHighlights: MateEntityHighlights | null
  preAssemblySelection: PreAssemblyPanelSelection
  focusedLimitConstraintId: string | null
  limitsInstallActive: boolean
  appearanceEditActive: boolean
}

/** Stan po kliknięciu w pustą scenę — zawsze ten sam wynik. */
export function createClearedViewportSelectionState(): ClearedViewportSelectionState {
  return {
    selection: createEmptySelection(),
    probableFaces: [],
    activeProgramPartId: null,
    treeMateHighlights: null,
    preAssemblySelection: null,
    focusedLimitConstraintId: null,
    limitsInstallActive: false,
    appearanceEditActive: false,
  }
}

/** LKM bez Shift — czyści zaznaczenie (orbit/pan nie). */
export function shouldClearSelectionOnPointerMiss(ev: {
  button: number
  shiftKey: boolean
}): boolean {
  return ev.button === 0 && !ev.shiftKey
}
