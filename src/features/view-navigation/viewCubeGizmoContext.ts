import { createContext, useContext } from 'react'
import type { Vector3 } from 'three'

export type ViewCubeGizmoContextValue = {
  tweenCamera: (direction: Vector3) => void
}

export const ViewCubeGizmoContext = createContext<ViewCubeGizmoContextValue | null>(null)

export function useViewCubeGizmoContext(): ViewCubeGizmoContextValue {
  const ctx = useContext(ViewCubeGizmoContext)
  if (!ctx) {
    throw new Error('useViewCubeGizmoContext must be used inside ViewCubeGizmoHelper')
  }
  return ctx
}
