import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import { ellipseChainLocalPolyline } from '../model-selection/edgeEllipseSelection'
import { MATE_PLANE_OVERLAY } from './matePlaneFaceOverlay'
import type { MateEllipseRef } from './model'

export type MateEllipseOverlayProps = {
  geometry: BufferGeometry
  ellipse: MateEllipseRef
  variant: keyof typeof MATE_PLANE_OVERLAY
}

export function MateEllipseOverlay({ geometry, ellipse, variant }: MateEllipseOverlayProps) {
  const points = useMemo(
    () => ellipseChainLocalPolyline(geometry, ellipse.vertexIndices, ellipse.closed),
    [geometry, ellipse.vertexIndices, ellipse.closed],
  )

  if (!points || points.length < 2) return null

  const style = MATE_PLANE_OVERLAY[variant]
  return (
    <Line
      points={points}
      color={style.color}
      lineWidth={3}
      transparent
      opacity={0.95}
      depthTest={false}
      renderOrder={6}
    />
  )
}
