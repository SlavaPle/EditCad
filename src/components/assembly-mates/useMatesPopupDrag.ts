import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const DEFAULT_POSITION = { x: 16, y: 72 }

export function useMatesPopupDrag() {
  const [position, setPosition] = useState(DEFAULT_POSITION)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  )
  const [dragging, setDragging] = useState(false)

  const onHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
      }
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [position.x, position.y],
  )

  useEffect(() => {
    if (!dragging) return

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      setPosition({
        x: Math.max(8, drag.originX + dx),
        y: Math.max(8, drag.originY + dy),
      })
    }

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging])

  return { position, dragging, onHeaderPointerDown }
}
