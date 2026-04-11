import { Vector3, type BufferGeometry } from 'three'
import type { EdgeSelection } from '../../lib/selection'

// Kwadrat odległości punktu P do odcinka AB w R^3
export function distSqPointToSegment(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  const abx = bx - ax
  const aby = by - ay
  const abz = bz - az
  const apx = px - ax
  const apy = py - ay
  const apz = pz - az
  const abLenSq = abx * abx + aby * aby + abz * abz
  if (abLenSq === 0) {
    return apx * apx + apy * apy + apz * apz
  }
  let t = (apx * abx + apy * aby + apz * abz) / abLenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * abx
  const cy = ay + t * aby
  const cz = az + t * abz
  const dx = px - cx
  const dy = py - cy
  const dz = pz - cz
  return dx * dx + dy * dy + dz * dz
}

// Proponowany próg kliknięcia w przestrzeni lokalnej modelu (ułamek przekątnej AABB)
export function edgePickToleranceFromGeometry(geometry: BufferGeometry, factor = 0.02): number {
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox()
  }
  const box = geometry.boundingBox
  if (!box) {
    return 1e-3
  }
  const diagonal = box.min.distanceTo(box.max)
  const d = diagonal * factor
  return Math.max(d, 1e-6)
}

// Wybór krawędzi trójkąta najbliższej punktowi trafienia promienia (współrzędne lokalne siatki)
export function pickClosestTriangleEdge(
  geometry: BufferGeometry,
  faceIndex: number,
  localPoint: Vector3,
  maxDistance: number,
): EdgeSelection | null {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  if (!position) return null

  let ia: number
  let ib: number
  let ic: number

  if (index) {
    const base = faceIndex * 3
    ia = index.getX(base)
    ib = index.getX(base + 1)
    ic = index.getX(base + 2)
  } else {
    ia = faceIndex * 3
    ib = faceIndex * 3 + 1
    ic = faceIndex * 3 + 2
  }

  const px = localPoint.x
  const py = localPoint.y
  const pz = localPoint.z

  const maxSq = maxDistance * maxDistance

  const candidates: EdgeSelection[] = [
    { a: ia, b: ib },
    { a: ib, b: ic },
    { a: ic, b: ia },
  ]

  let best: EdgeSelection | null = null
  let bestDistSq = Number.POSITIVE_INFINITY

  for (const e of candidates) {
    const x1 = position.getX(e.a)
    const y1 = position.getY(e.a)
    const z1 = position.getZ(e.a)
    const x2 = position.getX(e.b)
    const y2 = position.getY(e.b)
    const z2 = position.getZ(e.b)
    const dSq = distSqPointToSegment(px, py, pz, x1, y1, z1, x2, y2, z2)
    if (dSq < bestDistSq) {
      bestDistSq = dSq
      best = e
    }
  }

  if (best === null || bestDistSq > maxSq) {
    return null
  }

  return best
}
