import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import { localLineSegmentPositions } from './lineWorldFrame'
import { MATE_PLANE_OVERLAY } from './matePlaneFaceOverlay'
import type { MateLineRef } from './model'

export type MateLineOverlayProps = {
  geometry: BufferGeometry
  line: MateLineRef
  variant: keyof typeof MATE_PLANE_OVERLAY
}

export function MateLineOverlay({ geometry, line, variant }: MateLineOverlayProps) {
  const points = useMemo(() => {
    const segment = localLineSegmentPositions(geometry, line)
    if (!segment) return null
    return [
      [segment[0], segment[1], segment[2]] as [number, number, number],
      [segment[3], segment[4], segment[5]] as [number, number, number],
    ]
  }, [geometry, line])

  if (!points) return null

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
