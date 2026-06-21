import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { DoubleSide, type BufferGeometry, type Mesh } from 'three'
import {
  buildMatePlaneFaceOverlayGeometry,
  MATE_PLANE_OVERLAY,
} from './matePlaneFaceOverlay'

export type MatePlaneFaceOverlayProps = {
  geometry: BufferGeometry
  faceIndices: readonly number[]
  variant: keyof typeof MATE_PLANE_OVERLAY
}

export function MatePlaneFaceOverlay({
  geometry,
  faceIndices,
  variant,
}: MatePlaneFaceOverlayProps) {
  const meshRef = useRef<Mesh>(null)
  const overlayGeometry = useMemo(
    () => buildMatePlaneFaceOverlayGeometry(geometry, faceIndices),
    [geometry, faceIndices],
  )

  useEffect(() => {
    if (!overlayGeometry) return
    return () => {
      overlayGeometry.dispose()
    }
  }, [overlayGeometry])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.raycast = () => {}
  }, [overlayGeometry])

  if (!overlayGeometry) return null

  const style = MATE_PLANE_OVERLAY[variant]
  return (
    <mesh ref={meshRef} geometry={overlayGeometry} renderOrder={5}>
      <meshBasicMaterial
        color={style.color}
        side={DoubleSide}
        depthWrite={false}
        transparent
        opacity={style.opacity}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  )
}
