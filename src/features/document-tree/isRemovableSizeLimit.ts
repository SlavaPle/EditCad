import type { DocumentTreeNode } from './model'

/**
 * Limit można usunąć z drzewa, gdy węzeł ma constraintId i status limitu
 * (elementarny lub wspólny block/panel/profil — usunięcie zdejmuje cały constraint).
 */
export function isRemovableSizeLimit(node: DocumentTreeNode): boolean {
  if (!node.constraintId) return false
  const status = node.sizeStatus
  return (
    status === 'min' ||
    status === 'max' ||
    status === 'minmax' ||
    status === 'const' ||
    status === 'block' ||
    status === 'panel' ||
    status === 'profil'
  )
}
