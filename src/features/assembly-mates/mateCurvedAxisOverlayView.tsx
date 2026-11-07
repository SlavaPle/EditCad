import { useMemo } from 'react'
import type { BufferGeometry } from 'three'
import { FatLineSegments } from '../../components/Viewer3D/FatLineSegments'
import { dashDotAxisPositions } from './dashDotAxisPositions'
import { MATE_PLANE_OVERLAY, type MateCurvedAxisLocal } from './matePlaneFaceOverlay'

export type MateCurvedAxisOverlayProps = {
  geometry: BufferGeometry
  axis: MateCurvedAxisLocal
  variant: keyof typeof MATE_PLANE_OVERLAY
}

/** Oś curvedPlane: tylko sztrichpunktir (bez mesh/points — nie blokują pick). */
export function MateCurvedAxisOverlay({ geometry, axis, variant }: MateCurvedAxisOverlayProps) {
  const style = MATE_PLANE_OVERLAY[variant]
  const positions = useMemo(() => {
    if (!geometry.boundingSphere) geometry.computeBoundingSphere()
    const scale = geometry.boundingSphere?.radius ?? undefined
    return dashDotAxisPositions(axis.from, axis.to, scale)
  }, [geometry, axis.from, axis.to])

  return (
    <FatLineSegments
      positions={positions}
      color={style.color}
      linewidth={1.5}
      renderOrder={12}
      depthTest={false}
      raycastDisabled
    />
  )
}
