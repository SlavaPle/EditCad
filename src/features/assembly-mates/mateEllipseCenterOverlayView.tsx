import { useMemo } from 'react'
import { Line, Sphere } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import {
  ellipseCenterFromVertexChain,
  ellipseChainLocalPolyline,
} from '../model-selection/edgeEllipseSelection'
import { MATE_PLANE_OVERLAY } from './matePlaneFaceOverlay'
import type { MateEllipseCenterRef } from './model'

export type MateEllipseCenterOverlayProps = {
  geometry: BufferGeometry
  center: MateEllipseCenterRef
  variant: keyof typeof MATE_PLANE_OVERLAY
}

/** Wybrane centrum łuku: punkt + delikatny zarys krzywej. */
export function MateEllipseCenterOverlay({
  geometry,
  center,
  variant,
}: MateEllipseCenterOverlayProps) {
  const points = useMemo(
    () => ellipseChainLocalPolyline(geometry, center.vertexIndices, center.closed),
    [geometry, center.vertexIndices, center.closed],
  )
  const centerLocal = useMemo(
    () => ellipseCenterFromVertexChain(geometry, center.vertexIndices)?.center ?? null,
    [geometry, center.vertexIndices],
  )

  if (!centerLocal) return null

  const style = MATE_PLANE_OVERLAY[variant]
  const radius = Math.max(1e-4, (geometry.boundingSphere?.radius ?? 1) * 0.022)

  return (
    <group>
      {points && points.length >= 2 && (
        <Line
          points={points}
          color={style.color}
          lineWidth={2}
          transparent
          opacity={0.45}
          depthTest={false}
          renderOrder={6}
        />
      )}
      <Sphere args={[radius, 12, 12]} position={centerLocal} renderOrder={8}>
        <meshBasicMaterial color={style.color} transparent opacity={0.95} depthTest={false} />
      </Sphere>
    </group>
  )
}
