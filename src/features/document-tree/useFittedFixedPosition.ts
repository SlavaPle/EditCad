import { useLayoutEffect, useRef, useState } from 'react'
import { fitFixedPopupInViewport } from './fitFixedPopupInViewport'

/**
 * Preferowana pozycja fixed → po pomiarze elementu trzyma popup w viewport
 * (np. gdy wiersz drzewa jest na dole okna).
 */
export function useFittedFixedPosition(preferredLeft: number, preferredTop: number) {
  const ref = useRef<HTMLElement | null>(null)
  const [style, setStyle] = useState({ left: preferredLeft, top: preferredTop })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) {
      setStyle({ left: preferredLeft, top: preferredTop })
      return
    }

    const apply = () => {
      const { width, height } = el.getBoundingClientRect()
      setStyle(
        fitFixedPopupInViewport({
          left: preferredLeft,
          top: preferredTop,
          width,
          height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        }),
      )
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [preferredLeft, preferredTop])

  return { ref, style }
}
