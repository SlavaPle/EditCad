import { useMemo } from 'react'
import type { BufferGeometry } from 'three'
import { Sphere } from '@react-three/drei'
import { FatLineSegments } from '../../components/Viewer3D/FatLineSegments'
import { curvedAxisMarkerRadius, dashDotAxisPositions } from './dashDotAxisPositions'
import { MATE_PLANE_OVERLAY, type MateCurvedAxisLocal } from './matePlaneFaceOverlay'

export type MateCurvedAxisOverlayProps = {
  geometry: BufferGeometry
  axis: MateCurvedAxisLocal
  variant: keyof typeof MATE_PLANE_OVERLAY
}

/** Oś curvedPlane: sztrichpunktir + małe markery końców w skali osi. */
export function MateCurvedAxisOverlay({ geometry, axis, variant }: MateCurvedAxisOverlayProps) {
  const style = MATE_PLANE_OVERLAY[variant]
  const { positions, markerRadius } = useMemo(() => {
    if (!geometry.boundingSphere) geometry.computeBoundingSphere()
    const scale = geometry.boundingSphere?.radius ?? undefined
    const axisLen = Math.hypot(
      axis.to[0] - axis.from[0],
      axis.to[1] - axis.from[1],
      axis.to[2] - axis.from[2],
    )
    return {
      positions: dashDotAxisPositions(axis.from, axis.to, scale),
      markerRadius: curvedAxisMarkerRadius(axisLen, scale),
    }
  }, [geometry, axis.from, axis.to])

  return (
    <group>
      <FatLineSegments
        positions={positions}
        color={style.color}
        linewidth={1.5}
        renderOrder={12}
        depthTest={false}
        raycastDisabled
      />
      <Sphere args={[markerRadius, 10, 10]} position={axis.from} renderOrder={13}>
        <meshBasicMaterial color={style.color} transparent opacity={0.95} depthTest={false} />
      </Sphere>
      <Sphere args={[markerRadius, 10, 10]} position={axis.to} renderOrder={13}>
        <meshBasicMaterial color={style.color} transparent opacity={0.95} depthTest={false} />
      </Sphere>
    </group>
  )
}
