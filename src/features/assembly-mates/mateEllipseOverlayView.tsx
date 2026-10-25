import { useMemo } from 'react'
import { Line, Sphere } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import {
  ellipseCenterFromVertexChain,
  ellipseChainLocalPolyline,
} from '../model-selection/edgeEllipseSelection'
import { MATE_PLANE_OVERLAY } from './matePlaneFaceOverlay'
import type { MateEllipseRef } from './model'

export type MateEllipseOverlayProps = {
  geometry: BufferGeometry
  ellipse: MateEllipseRef
  variant: keyof typeof MATE_PLANE_OVERLAY
  /** Domyślnie true — widać środek łuku. */
  showCenter?: boolean
}

export function MateEllipseOverlay({
  geometry,
  ellipse,
  variant,
  showCenter = true,
}: MateEllipseOverlayProps) {
  const points = useMemo(
    () => ellipseChainLocalPolyline(geometry, ellipse.vertexIndices, ellipse.closed),
    [geometry, ellipse.vertexIndices, ellipse.closed],
  )
  const centerLocal = useMemo(
    () =>
      showCenter
        ? ellipseCenterFromVertexChain(geometry, ellipse.vertexIndices)?.center ?? null
        : null,
    [geometry, ellipse.vertexIndices, showCenter],
  )

  if (!points || points.length < 2) return null

  const style = MATE_PLANE_OVERLAY[variant]
  const radius = Math.max(1e-4, (geometry.boundingSphere?.radius ?? 1) * 0.018)

  return (
    <group>
      <Line
        points={points}
        color={style.color}
        lineWidth={3}
        transparent
        opacity={0.95}
        depthTest={false}
        renderOrder={6}
      />
      {centerLocal && (
        <Sphere args={[radius, 12, 12]} position={centerLocal} renderOrder={7}>
          <meshBasicMaterial color={style.color} transparent opacity={0.95} depthTest={false} />
        </Sphere>
      )}
    </group>
  )
}
