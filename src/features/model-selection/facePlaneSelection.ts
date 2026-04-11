import { Vector3, type BufferGeometry } from 'three'

const NORMAL_EPSILON = 1e-4
const DIST_EPSILON = 1e-3
const POSITION_EPSILON = 1e-5

type FaceVertices = [number, number, number]

// Indeksy wierzchołków dla każdej ściany trójkąta (numeracja ścian jak w buforze indeksów)
export function getFaceVertices(geometry: BufferGeometry): FaceVertices[] {
  const cached = (geometry as { userData: { __faceVertices?: FaceVertices[] } }).userData.__faceVertices
  if (cached) return cached

  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()

  const faceCount = index ? index.count / 3 : position.count / 3
  const faces: FaceVertices[] = new Array(faceCount)

  if (index) {
    for (let f = 0; f < faceCount; f++) {
      const ia = index.getX(f * 3)
      const ib = index.getX(f * 3 + 1)
      const ic = index.getX(f * 3 + 2)
      faces[f] = [ia, ib, ic]
    }
  } else {
    for (let f = 0; f < faceCount; f++) {
      const ia = f * 3
      const ib = f * 3 + 1
      const ic = f * 3 + 2
      faces[f] = [ia, ib, ic]
    }
  }

  ;(geometry as { userData: { __faceVertices?: FaceVertices[] } }).userData.__faceVertices = faces
  return faces
}

function getFaceNeighbors(geometry: BufferGeometry): number[][] {
  const cached = (geometry as { userData: { __faceNeighbors?: number[][] } }).userData.__faceNeighbors
  if (cached) return cached

  const faces = getFaceVertices(geometry)
  const neighbors: number[][] = faces.map(() => [])

  const edgeMap = new Map<string, number[]>()

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

  const addEdge = (a: number, b: number, faceIndex: number) => {
    const ca = canonicalIndex[a]
    const cb = canonicalIndex[b]
    const edgeKey = ca < cb ? `${ca}_${cb}` : `${cb}_${ca}`
    const arr = edgeMap.get(edgeKey)
    if (arr) {
      arr.push(faceIndex)
    } else {
      edgeMap.set(edgeKey, [faceIndex])
    }
  }

  faces.forEach(([a, b, c], faceIndex) => {
    addEdge(a, b, faceIndex)
    addEdge(b, c, faceIndex)
    addEdge(c, a, faceIndex)
  })

  for (const list of edgeMap.values()) {
    if (list.length < 2) continue
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const f1 = list[i]
        const f2 = list[j]
        neighbors[f1].push(f2)
        neighbors[f2].push(f1)
      }
    }
  }

  ;(geometry as { userData: { __faceNeighbors?: number[][] } }).userData.__faceNeighbors = neighbors
  return neighbors
}

function computeFacePlane(
  geometry: BufferGeometry,
  faces: FaceVertices[],
  faceIndex: number,
  targetNormal: Vector3,
): { normal: Vector3; constant: number } {
  const position = geometry.getAttribute('position')
  const [ia, ib, ic] = faces[faceIndex]

  const ax = position.getX(ia)
  const ay = position.getY(ia)
  const az = position.getZ(ia)

  const bx = position.getX(ib)
  const by = position.getY(ib)
  const bz = position.getZ(ib)

  const cx = position.getX(ic)
  const cy = position.getY(ic)
  const cz = position.getZ(ic)

  const abx = bx - ax
  const aby = by - ay
  const abz = bz - az

  const acx = cx - ax
  const acy = cy - ay
  const acz = cz - az

  targetNormal.set(
    aby * acz - abz * acy,
    abz * acx - abx * acz,
    abx * acy - aby * acx,
  )

  targetNormal.normalize()

  const constant = -(targetNormal.x * ax + targetNormal.y * ay + targetNormal.z * az)
  return { normal: targetNormal, constant }
}

function isCoplanarNeighbor(
  geometry: BufferGeometry,
  faces: FaceVertices[],
  baseNormal: Vector3,
  baseConstant: number,
  neighborFaceIndex: number,
  tmpNormal: Vector3,
): boolean {
  const { normal, constant } = computeFacePlane(geometry, faces, neighborFaceIndex, tmpNormal)

  const dot = baseNormal.dot(normal)
  if (1 - dot > NORMAL_EPSILON) {
    return false
  }

  const distDiff = Math.abs(constant - baseConstant)
  return distDiff <= DIST_EPSILON
}

// Wszystkie ściany spójnie leżące w tej samej płaszczyźnie co seed (BFS po sąsiadach krawędzi)
export function getCoplanarConnectedFaces(geometry: BufferGeometry, seedFaceIndex: number): number[] {
  const faces = getFaceVertices(geometry)
  const neighbors = getFaceNeighbors(geometry)

  const baseNormal = new Vector3()
  const tmpNormal = new Vector3()
  const { normal, constant } = computeFacePlane(geometry, faces, seedFaceIndex, baseNormal)
  const baseConstant = constant

  const result: number[] = []
  const visited = new Set<number>()
  const queue: number[] = []

  visited.add(seedFaceIndex)
  queue.push(seedFaceIndex)

  while (queue.length > 0) {
    const current = queue.shift() as number
    result.push(current)

    for (const n of neighbors[current]) {
      if (visited.has(n)) continue
      if (!isCoplanarNeighbor(geometry, faces, normal, baseConstant, n, tmpNormal)) continue
      visited.add(n)
      queue.push(n)
    }
  }

  return result
}

// Czy dwie ściany leżą w tej samej płaszczyźnie (jak sąsiedzi w getCoplanarConnectedFaces)
export function areFacesCoplanar(geometry: BufferGeometry, faceI: number, faceJ: number): boolean {
  if (faceI === faceJ) return true
  const faces = getFaceVertices(geometry)
  const baseNormal = new Vector3()
  const tmpNormal = new Vector3()
  const { normal, constant } = computeFacePlane(geometry, faces, faceI, baseNormal)
  return isCoplanarNeighbor(geometry, faces, normal, constant, faceJ, tmpNormal)
}
