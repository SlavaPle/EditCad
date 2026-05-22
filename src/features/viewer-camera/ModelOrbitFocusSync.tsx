import { useLayoutEffect } from 'react'
import { useBounds } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { BufferGeometry } from 'three'
import { syncOrbitFocusFromGeometry } from './modelOrbitFocus'

type ModelOrbitFocusSyncProps = {
  model: BufferGeometry | null | undefined
  geometryRevision: number
}

/**
 * Wewnątrz Bounds: środek z bieżącej geometrii (wierzchołki), nie (0,0,0) przy pustym bounds.
 */
export function ModelOrbitFocusSync({ model, geometryRevision }: ModelOrbitFocusSyncProps) {
  const bounds = useBounds()
  const controls = useThree((state) => state.controls)

  useLayoutEffect(() => {
    if (!model) return
    const position = model.getAttribute('position')
    if (!position || position.count === 0) return

    bounds.refresh()
    syncOrbitFocusFromGeometry(controls, model)
  }, [model, geometryRevision, bounds, controls])

  return null
}
