import type { DocumentTreeContextActionId, DocumentTreeNode } from './model'

/**
 * Skutek podwójnego kliknięcia: wejście w edycję wartości rozmiaru (X/Y/Z / custom).
 */
export type DocumentTreeEditAction =
  | { kind: 'contextAction'; action: DocumentTreeContextActionId }
  | { kind: 'none' }

export function resolveDocumentTreeEditAction(node: DocumentTreeNode): DocumentTreeEditAction {
  if (node.kind === 'size' || node.kind === 'sizeCustom') {
    // CONST / locked: panel nadal otwieramy (usuń limit); bez constraint i bez editable — none
    if (node.editable === false && !node.constraintId) return { kind: 'none' }
    if ((node.faceIndices?.length ?? 0) < 2) return { kind: 'none' }
    return { kind: 'contextAction', action: 'editSize' }
  }
  return { kind: 'none' }
}
