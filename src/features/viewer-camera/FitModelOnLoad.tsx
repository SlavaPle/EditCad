import { useLayoutEffect } from 'react'
import { useBounds } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { BufferGeometry } from 'three'
import { fitModelToView } from './fitModelToView'
import { syncOrbitFocusFromGeometry } from './modelOrbitFocus'

type FitModelOnLoadProps = {
  model: BufferGeometry | null | undefined
  /** Zmienia się przy każdym otwarciu nowego pliku (np. modelKey). */
  loadToken: number
}

/** Dopasowuje widok po załadowaniu detalu — fit po zamontowaniu siatki w Bounds. */
export function FitModelOnLoad({ model, loadToken }: FitModelOnLoadProps) {
  const bounds = useBounds()
  const controls = useThree((state) => state.controls)

  useLayoutEffect(() => {
    if (!model) return

    let cancelled = false
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        fitModelToView(bounds)
        syncOrbitFocusFromGeometry(controls, model)
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [model, loadToken, bounds, controls])

  return null
}
