import { isSizeLockedByCustom } from './isSizeLockedByCustom'
import type { DocumentTreeContextActionId, DocumentTreeNode } from './model'

/**
 * Skutek podwójnego kliknięcia w węzeł drzewa: wejście w edycję
 * (LKM = wybór, DblClick = edycja — jak w Inventor / SolidWorks).
 *
 * Zwraca id akcji z menu kontekstowego, żeby Overlay mógł użyć tego samego handlera.
 */
export type DocumentTreeEditAction =
  | { kind: 'contextAction'; action: DocumentTreeContextActionId }
  | { kind: 'none' }

export function resolveDocumentTreeEditAction(node: DocumentTreeNode): DocumentTreeEditAction {
  if (node.kind === 'appearance') {
    return { kind: 'contextAction', action: 'editAppearance' }
  }
  if (node.kind === 'size' || node.kind === 'sizeCustom') {
    // Oś zależna od custom — edycja tylko na węźle sizeCustom
    if (isSizeLockedByCustom(node)) return { kind: 'none' }
    // CONST / locked: panel nadal otwieramy (usuń limit); bez constraint i bez editable — none
    if (node.editable === false && !node.constraintId) return { kind: 'none' }
    if ((node.faceIndices?.length ?? 0) < 2) return { kind: 'none' }
    return { kind: 'contextAction', action: 'editSize' }
  }
  return { kind: 'none' }
}
