import { Vector3, type BufferGeometry } from 'three'

function distSq(
  ax: number,
  ay: number,
  az: number,
  px: number,
  py: number,
  pz: number,
): number {
  const dx = px - ax
  const dy = py - ay
  const dz = pz - az
  return dx * dx + dy * dy + dz * dz
}

// Indeksy wierzchołków trójkąta dla danej ściany (jak w buforze indeksów)
function triangleVertexIndices(geometry: BufferGeometry, faceIndex: number): [number, number, number] {
  const index = geometry.getIndex()
  if (index) {
    const base = faceIndex * 3
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
  }
  const ia = faceIndex * 3
  return [ia, ia + 1, ia + 2]
}

// Wybór wierzchołka trójkąta najbliższego punktowi trafienia (współrzędne lokalne siatki)
export function pickClosestTriangleVertex(
  geometry: BufferGeometry,
  faceIndex: number,
  localPoint: Vector3,
  maxDistance: number,
): number | null {
  const position = geometry.getAttribute('position')
  if (!position) return null

  const [ia, ib, ic] = triangleVertexIndices(geometry, faceIndex)
  const px = localPoint.x
  const py = localPoint.y
  const pz = localPoint.z

  const candidates: [number, number, number] = [ia, ib, ic]
  let bestIndex: number | null = null
  let bestDistSq = Number.POSITIVE_INFINITY

  for (const vi of candidates) {
    const ax = position.getX(vi)
    const ay = position.getY(vi)
    const az = position.getZ(vi)
    const dSq = distSq(ax, ay, az, px, py, pz)
    if (dSq < bestDistSq) {
      bestDistSq = dSq
      bestIndex = vi
    }
  }

  const maxSq = maxDistance * maxDistance
  if (bestIndex === null || bestDistSq > maxSq) {
    return null
  }

  return bestIndex
}
