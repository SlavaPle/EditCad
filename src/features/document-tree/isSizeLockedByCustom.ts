import type { DocumentTreeNode } from './model'

/**
 * Oś kanoniczna zablokowana przez rozmiar niekanoniczny (custom) —
 * edycja tylko na węźle sizeCustom; Y/Z tylko zależne (bez siatki kroku UI).
 */
export function isSizeLockedByCustom(
  node: Pick<DocumentTreeNode, 'sizeStatus' | 'sizeLockReason'>,
): boolean {
  return node.sizeStatus === 'lockedByCustom' || node.sizeLockReason === 'customConflict'
}
