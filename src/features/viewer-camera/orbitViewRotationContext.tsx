import { createContext, useContext } from 'react'
import type { Vector3 } from 'three'

export type OrbitViewRotationContextValue = {
  /** Animowany obrót widoku do kierunku (gizmo-kostka). */
  rotateViewToDirection: (direction: Vector3) => void
  /** Dopasowanie detalu do pełnego kadru (środek AABB + zoom). */
  fitModelToFullView: () => void
}

export const OrbitViewRotationContext = createContext<OrbitViewRotationContextValue | null>(null)

export function useOrbitViewRotation(): OrbitViewRotationContextValue {
  const ctx = useContext(OrbitViewRotationContext)
  if (!ctx) {
    throw new Error('useOrbitViewRotation must be used inside OrbitViewRotationProvider')
  }
  return ctx
}
