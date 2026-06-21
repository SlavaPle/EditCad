import { useMemo } from 'react'
import { Sphere } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import { MATE_PLANE_OVERLAY } from './matePlaneFaceOverlay'
import type { MateVertexRef } from './model'

export type MateVertexOverlayProps = {
  geometry: BufferGeometry
  vertex: MateVertexRef
  variant: keyof typeof MATE_PLANE_OVERLAY
}

function localVertexPosition(geometry: BufferGeometry, vertexIndex: number): [number, number, number] | null {
  const position = geometry.getAttribute('position')
  if (!position || vertexIndex < 0 || vertexIndex >= position.count) return null
  return [position.getX(vertexIndex), position.getY(vertexIndex), position.getZ(vertexIndex)]
}

export function MateVertexOverlay({ geometry, vertex, variant }: MateVertexOverlayProps) {
  const point = useMemo(() => localVertexPosition(geometry, vertex.vertexIndex), [geometry, vertex.vertexIndex])
  if (!point) return null

  const style = MATE_PLANE_OVERLAY[variant]
  const radius = Math.max(1e-4, (geometry.boundingSphere?.radius ?? 1) * 0.015)

  return (
    <Sphere
      args={[radius, 12, 12]}
      position={point}
    >
      <meshBasicMaterial color={style.color} transparent opacity={0.9} depthTest={false} />
    </Sphere>
  )
}
