import type { DocumentTreeContextActionId, DocumentTreeNode } from './model'

/**
 * Skutek podwójnego kliknięcia w węzeł drzewa: wejście w edycję
 * (LKM = wybór, DblClick = edycja — jak w Inventor / SolidWorks).
 *
 * part / appearance → Edit Appearance (aktualny tryb edycji detalu).
 * Mate / element — gdy pojawi się osobny editor.
 */
export type DocumentTreeEditAction =
  | { kind: 'contextAction'; action: DocumentTreeContextActionId }
  | { kind: 'none' }

/**
 * Mapuje rodzaj węzła na akcję edycji po double-click.
 * Zwraca id akcji z menu kontekstowego, żeby Overlay mógł użyć tego samego handlera.
 */
export function resolveDocumentTreeEditAction(node: DocumentTreeNode): DocumentTreeEditAction {
  switch (node.kind) {
    case 'appearance':
    case 'part':
      return { kind: 'contextAction', action: 'editAppearance' }
    case 'mate':
    case 'element':
    case 'root':
    case 'model':
    case 'size':
    case 'elementsGroup':
    case 'matesGroup':
    default:
      return { kind: 'none' }
  }
}
