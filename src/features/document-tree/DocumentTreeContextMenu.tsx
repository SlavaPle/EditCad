import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentTreeContextMenuIcon } from './DocumentTreeContextMenuIcons'
import { isRemovableSizeLimit } from './isRemovableSizeLimit'
import type { DocumentTreeContextActionId, DocumentTreeNode } from './model'
import styles from './DocumentTree.module.css'

export type DocumentTreeContextMenuItem = {
  id: DocumentTreeContextActionId
  labelKey: string
  disabled?: boolean
}

export function buildContextMenuItems(node: DocumentTreeNode): DocumentTreeContextMenuItem[] {
  switch (node.kind) {
    case 'root':
      return [
        { id: 'expandAll', labelKey: 'documentTree.menu.expandAll' },
        { id: 'collapseAll', labelKey: 'documentTree.menu.collapseAll' },
        { id: 'addCustomSize', labelKey: 'documentTree.menu.addCustomSize' },
      ]
    case 'part':
      return [
        { id: 'select', labelKey: 'documentTree.menu.select' },
        node.locked
          ? { id: 'unlock', labelKey: 'documentTree.menu.unlock' }
          : { id: 'lock', labelKey: 'documentTree.menu.lock' },
        { id: 'addCustomSize', labelKey: 'documentTree.menu.addCustomSize' },
        { id: 'removePart', labelKey: 'documentTree.menu.removePart' },
      ]
    case 'appearance':
      return [{ id: 'editAppearance', labelKey: 'documentTree.menu.editAppearance' }]
    case 'size':
    case 'sizeCustom':
      return [
        {
          id: 'editSize',
          labelKey: 'documentTree.menu.editSize',
          disabled: node.editable === false && !node.constraintId,
        },
        {
          id: 'renameSize',
          labelKey: 'documentTree.menu.renameSize',
        },
        {
          id: 'removeSizeLimit',
          labelKey: 'documentTree.menu.removeSizeLimit',
          disabled: !isRemovableSizeLimit(node),
        },
        { id: 'copySize', labelKey: 'documentTree.menu.copySize', disabled: node.sizeMm == null },
      ]
    case 'element':
      return [{ id: 'highlightElement', labelKey: 'documentTree.menu.highlightElement' }]
    case 'mate':
      return [
        { id: 'highlightMate', labelKey: 'documentTree.menu.highlightMate' },
        { id: 'clearMateHighlight', labelKey: 'documentTree.menu.clearMateHighlight' },
        node.suppressed
          ? { id: 'unsuppressMate', labelKey: 'documentTree.menu.unsuppressMate' }
          : { id: 'suppressMate', labelKey: 'documentTree.menu.suppressMate' },
        { id: 'deleteMate', labelKey: 'documentTree.menu.deleteMate' },
      ]
    case 'sizesGroup':
      return [{ id: 'addCustomSize', labelKey: 'documentTree.menu.addCustomSize' }]
    case 'model':
    case 'elementsGroup':
    case 'matesGroup':
    default:
      return []
  }
}

export type DocumentTreeContextMenuProps = {
  x: number
  y: number
  node: DocumentTreeNode
  onAction: (action: DocumentTreeContextActionId) => void
  onClose: () => void
}

export function DocumentTreeContextMenu({
  x,
  y,
  node,
  onAction,
  onClose,
}: DocumentTreeContextMenuProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLUListElement>(null)
  const items = buildContextMenuItems(node)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [onClose])

  if (items.length === 0) return null

  return (
    <ul
      ref={ref}
      className={styles.contextMenu}
      style={{ left: x, top: y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <li key={item.id} role="none">
          <button
            type="button"
            role="menuitem"
            className={
              item.disabled
                ? `${styles.contextItem} ${styles.contextItemDisabled}`
                : styles.contextItem
            }
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              onAction(item.id)
              onClose()
            }}
          >
            <span className={styles.contextItemIcon}>
              <DocumentTreeContextMenuIcon actionId={item.id} />
            </span>
            <span className={styles.contextItemLabel}>{t(item.labelKey)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
