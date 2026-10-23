import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ViewerContextMenuIcon } from './ViewerContextMenuIcons'
import styles from './ViewerContextMenu.module.css'

export type ViewerContextMenuActionId = 'addMate'

export type ViewerContextMenuItem = {
  id: ViewerContextMenuActionId
  labelKey: string
  disabled?: boolean
}

export type ViewerContextMenuState = {
  x: number
  y: number
}

export function buildViewerContextMenuItems(options: {
  canAddMate: boolean
}): ViewerContextMenuItem[] {
  return [
    {
      id: 'addMate',
      labelKey: 'mates.menu.addMate',
      disabled: !options.canAddMate,
    },
  ]
}

export type ViewerContextMenuProps = {
  x: number
  y: number
  items: readonly ViewerContextMenuItem[]
  onAction: (action: ViewerContextMenuActionId) => void
  onClose: () => void
}

export function ViewerContextMenu({
  x,
  y,
  items,
  onAction,
  onClose,
}: ViewerContextMenuProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLUListElement>(null)

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
              <ViewerContextMenuIcon actionId={item.id} />
            </span>
            <span className={styles.contextItemLabel}>{t(item.labelKey)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
