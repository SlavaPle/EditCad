import type { BufferGeometry } from 'three'

/** Długość odcinka między wierzchołkami siatki (mm). */
export function measureEdgeLengthMm(
  geometry: BufferGeometry,
  vertexA: number,
  vertexB: number,
): number | null {
  const pos = geometry.getAttribute('position')
  if (!pos) return null
  const ax = pos.getX(vertexA)
  const ay = pos.getY(vertexA)
  const az = pos.getZ(vertexA)
  const bx = pos.getX(vertexB)
  const by = pos.getY(vertexB)
  const bz = pos.getZ(vertexB)
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  return Math.hypot(dx, dy, dz)
}
