import { useLayoutEffect } from 'react'
import { useBounds } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import { fitModelToView } from './fitModelToView'

type FitModelOnLoadProps = {
  model: BufferGeometry | null | undefined
  /** Zmienia się przy każdym otwarciu nowego pliku (np. modelKey). */
  loadToken: number
}

/** Dopasowuje widok tylko po załadowaniu detalu — bez observe przy edycji geometrii. */
export function FitModelOnLoad({ model, loadToken }: FitModelOnLoadProps) {
  const bounds = useBounds()

  useLayoutEffect(() => {
    if (!model) return
    fitModelToView(bounds)
  }, [model, loadToken, bounds])

  return null
}
