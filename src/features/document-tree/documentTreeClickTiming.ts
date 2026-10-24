/**
 * Klasyfikacja LKM na węźle size:
 * - detail>=2 (dblclick) → edycja limitu/wartości
 * - wolny 2. pojedynczy klik na już zaznaczonym → kandydat rename (UI odkłada start,
 *   żeby dblclick mógł anulować)
 * - pierwszy klik → select
 */

export type DocumentTreeClickKind = 'select' | 'editValue' | 'renameCandidate'

export type DocumentTreeClickTimingState = {
  nodeId: string | null
  lastClickAt: number
}

/** Odstęp jak w eksploratorze — powyżej typowego interwału dblclick. */
export const DOCUMENT_TREE_RENAME_CLICK_GAP_MS = 450

/**
 * Opóźnienie startu rename po kandydacie — musi pokryć drugi klik dblclick
 * (gdy węzeł już zaznaczony, 1. klik detail=1 nie może od razu podmienić label→input).
 */
export const DOCUMENT_TREE_RENAME_DEFER_MS = 320

export function initialDocumentTreeClickTimingState(): DocumentTreeClickTimingState {
  return { nodeId: null, lastClickAt: 0 }
}

/**
 * @param detail — MouseEvent.detail (1 = single, 2 = double)
 */
export function classifyDocumentTreeSizeClick(params: {
  nodeId: string
  detail: number
  nowMs: number
  state: DocumentTreeClickTimingState
  isSelected: boolean
}): { kind: DocumentTreeClickKind; nextState: DocumentTreeClickTimingState } {
  const { nodeId, detail, nowMs, state, isSelected } = params

  if (detail >= 2) {
    return {
      kind: 'editValue',
      nextState: { nodeId, lastClickAt: nowMs },
    }
  }

  if (
    isSelected &&
    state.nodeId === nodeId &&
    nowMs - state.lastClickAt >= DOCUMENT_TREE_RENAME_CLICK_GAP_MS
  ) {
    return {
      kind: 'renameCandidate',
      nextState: { nodeId, lastClickAt: nowMs },
    }
  }

  return {
    kind: 'select',
    nextState: { nodeId, lastClickAt: nowMs },
  }
}
