import { type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useFittedFixedPosition } from './useFittedFixedPosition'
import styles from './DocumentTree.module.css'

export type DocumentTreeFittedSizePopupProps = {
  left: number
  top: number
  onMouseEnter: () => void
  onMouseLeave: () => void
  children: ReactNode
}

/** Portal size-popup z dopasowaniem do krawędzi viewport. */
export function DocumentTreeFittedSizePopup({
  left,
  top,
  onMouseEnter,
  onMouseLeave,
  children,
}: DocumentTreeFittedSizePopupProps) {
  const { ref, style } = useFittedFixedPosition(left, top)

  return createPortal(
    <div
      ref={ref as RefObject<HTMLDivElement | null>}
      className={styles.sizePopupLayerFixed}
      style={{ top: style.top, left: style.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body,
  )
}
