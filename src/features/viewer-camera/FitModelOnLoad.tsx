import { useLayoutEffect } from 'react'
import { useBounds } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { BufferGeometry } from 'three'
import { fitModelToFullView } from './fitModelToFullView'
import { resolveOrbitCamera } from './orbitViewRotation'
import {
  registerFitModelToFullViewHandler,
  requestFitModelToFullView,
} from './requestFitModelToFullView'

type FitModelOnLoadProps = {
  model: BufferGeometry | null | undefined
  /** Zmienia się przy każdym otwarciu nowego pliku (np. modelKey). */
  loadToken: number
}

/** Dopasowuje widok po załadowaniu detalu i rejestruje fit na pełny ekran. */
export function FitModelOnLoad({ model, loadToken }: FitModelOnLoadProps) {
  const bounds = useBounds()
  const controls = useThree((state) => state.controls)
  const storeCamera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    if (!model) {
      registerFitModelToFullViewHandler(null)
      return
    }

    const position = model.getAttribute('position')
    if (!position || position.count === 0) {
      registerFitModelToFullViewHandler(null)
      return
    }

    const runFit = () => {
      const orbitCamera = resolveOrbitCamera(controls, storeCamera)
      fitModelToFullView(model, orbitCamera, controls, { margin: 1.05 })
      bounds.refresh().clip()
    }

    registerFitModelToFullViewHandler(runFit)

    let cancelled = false
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) runFit()
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      registerFitModelToFullViewHandler(null)
    }
  }, [model, loadToken, bounds, controls, storeCamera])

  return null
}

export { requestFitModelToFullView }
