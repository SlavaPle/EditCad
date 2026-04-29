import { Vector3, type BufferGeometry } from 'three'
import type { EdgeSelection } from '../../lib/selection'
import { areFacesCoplanarForMeshEdgeCrease, getFaceVertices } from './facePlaneSelection'
import { distSqPointToSegment } from './edgeLineSelection'

const POSITION_EPSILON = 1e-5

// Reprezentant wierzchołka po zgrupowaniu pozycji (jak w facePlaneSelection)
function getCanonicalVertexIndex(geometry: BufferGeometry, vertexIndex: number): number {
  const position = geometry.getAttribute('position')
  const x = position.getX(vertexIndex)
  const y = position.getY(vertexIndex)
  const z = position.getZ(vertexIndex)
  const kx = Math.round(x / POSITION_EPSILON)
  const ky = Math.round(y / POSITION_EPSILON)
  const kz = Math.round(z / POSITION_EPSILON)
  const key = `${kx}_${ky}_${kz}`
  const map = (geometry as { userData: { __vertexKeyToCanonical?: Map<string, number> } }).userData
    .__vertexKeyToCanonical
  if (!map) return vertexIndex
  return map.get(key) ?? vertexIndex
}

function edgeKeyCanonical(ca: number, cb: number): string {
  return ca < cb ? `${ca}_${cb}` : `${cb}_${ca}`
}

// Mapa krawędź (kanoniczna) → lista indeksów ścian (jak w facePlaneSelection)
function getEdgeToFaceIndicesMap(geometry: BufferGeometry): Map<string, number[]> {
  const cached = (geometry as { userData: { __edgeToFaces?: Map<string, number[]> } }).userData
    .__edgeToFaces
  if (cached) return cached

  const faces = getFaceVertices(geometry)
  const position = geometry.getAttribute('position')
  const vertexCount = position.count
  const canonicalIndex = new Array<number>(vertexCount)
  const vertexKeyToCanonical = new Map<string, number>()

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const kx = Math.round(x / POSITION_EPSILON)
    const ky = Math.round(y / POSITION_EPSILON)
    const kz = Math.round(z / POSITION_EPSILON)
    const key = `${kx}_${ky}_${kz}`
    const existing = vertexKeyToCanonical.get(key)
    if (existing !== undefined) {
      canonicalIndex[i] = existing
    } else {
      vertexKeyToCanonical.set(key, i)
      canonicalIndex[i] = i
    }
  }

  ;(geometry as { userData: { __vertexKeyToCanonical?: Map<string, number> } }).userData
    .__vertexKeyToCanonical = vertexKeyToCanonical

  const edgeMap = new Map<string, number[]>()

  const addEdge = (a: number, b: number, faceIndex: number) => {
    const ca = canonicalIndex[a]
    const cb = canonicalIndex[b]
    const ek = edgeKeyCanonical(ca, cb)
    const arr = edgeMap.get(ek)
    if (arr) {
      arr.push(faceIndex)
    } else {
      edgeMap.set(ek, [faceIndex])
    }
  }

  faces.forEach(([a, b, c], faceIndex) => {
    addEdge(a, b, faceIndex)
    addEdge(b, c, faceIndex)
    addEdge(c, a, faceIndex)
  })

  ;(geometry as { userData: { __edgeToFaces?: Map<string, number[]> } }).userData.__edgeToFaces = edgeMap
  return edgeMap
}

/** Ściany używające tej krawędzi (indeksy bufora wierzchołków a, b) */
export function getIncidentFaceIndicesForEdge(
  geometry: BufferGeometry,
  rawVertexA: number,
  rawVertexB: number,
): readonly number[] {
  const map = getEdgeToFaceIndicesMap(geometry)
  const ca = getCanonicalVertexIndex(geometry, rawVertexA)
  const cb = getCanonicalVertexIndex(geometry, rawVertexB)
  return map.get(edgeKeyCanonical(ca, cb)) ?? []
}

/** Styk CAD: brzeg lub załamanie; odrzuca wewnętrzną przekątną triangulacji płaskiej. */
export function isIndexedEdgeACrease(geometry: BufferGeometry, rawA: number, rawB: number): boolean {
  const incident = getIncidentFaceIndicesForEdge(geometry, rawA, rawB)
  if (incident.length <= 1) {
    return true
  }
  for (let i = 0; i < incident.length; i++) {
    for (let j = i + 1; j < incident.length; j++) {
      if (!areFacesCoplanarForMeshEdgeCrease(geometry, incident[i], incident[j])) {
        return true
      }
    }
  }
  return false
}

/** Najbliższa strykowa krawędź trójkąta trafienia. */
export function pickClosestCreasedTriangleEdge(
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

  const scored = candidates
    .filter((e) => isIndexedEdgeACrease(geometry, e.a, e.b))
    .map((e) => {
      const x1 = position.getX(e.a)
      const y1 = position.getY(e.a)
      const z1 = position.getZ(e.a)
      const x2 = position.getX(e.b)
      const y2 = position.getY(e.b)
      const z2 = position.getZ(e.b)
      const dSq = distSqPointToSegment(px, py, pz, x1, y1, z1, x2, y2, z2)
      return { e, dSq }
    })
    .sort((u, v) => u.dSq - v.dSq)

  const best = scored[0]
  if (!best || best.dSq > maxSq) {
    return null
  }
  return best.e
}
