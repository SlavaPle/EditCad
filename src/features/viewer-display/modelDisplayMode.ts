import type { BufferAttribute, BufferGeometry, InterleavedBufferAttribute } from 'three'
import { getFaceVertices } from '../model-selection/facePlaneSelection'

export type ModelDisplayMode = 'solid' | 'edgesOnly' | 'solidWithEdges' | 'solidTextured'

export function isSolidBodyDisplayMode(mode: ModelDisplayMode): boolean {
  return mode !== 'edgesOnly'
}

export function usesModelEdgeLines(mode: ModelDisplayMode): boolean {
  return mode === 'edgesOnly' || mode === 'solidWithEdges'
}

export const DEFAULT_MODEL_DISPLAY_MODE: ModelDisplayMode = 'solid'

const POSITION_EPSILON = 1e-5

/** Kąt pomiędzy normalnymi sąsiadujących trójkątów poniżej tego progu traktujemy jako współpłaszczyznowe (ukryta krawędź triangulacji). */
const COPLANAR_MAX_ANGLE_RAD = (1.5 * Math.PI) / 180

function canonicalEdgeKey(ca: number, cb: number): string {
  return ca < cb ? `${ca}_${cb}` : `${cb}_${ca}`
}

type PositionAttribute = BufferAttribute | InterleavedBufferAttribute

function faceUnitNormal(
  ia: number,
  ib: number,
  ic: number,
  position: PositionAttribute,
): { x: number; y: number; z: number } | null {
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
  let nx = aby * acz - abz * acy
  let ny = abz * acx - abx * acz
  let nz = abx * acy - aby * acx
  const len = Math.hypot(nx, ny, nz)
  if (len < 1e-20) return null
  nx /= len
  ny /= len
  nz /= len
  return { x: nx, y: ny, z: nz }
}

function normalsSignificantCrease(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): boolean {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z
  const clamped = Math.min(1, Math.max(-1, dot))
  const angle = Math.acos(Math.min(1, Math.abs(clamped)))
  return angle >= COPLANAR_MAX_ANGLE_RAD
}

/**
 * Krawędzie konturu + „załamania” między ścianami niebędącymi współpłaszczyznowymi.
 * Wspólna krawędź dwóch trójkątów o prawie równoległych normalnych jest pomijana (brak widocznej triangulacji na płaskim płacie).
 */
export function buildMeshEdgeLinePositions(geometry: BufferGeometry): Float32Array | null {
  const position = geometry.getAttribute('position') as PositionAttribute | undefined
  if (!position) return null

  const faces = getFaceVertices(geometry)
  if (faces.length === 0) return null

  const vertexCount = position.count
  const canonicalIndex = new Array<number>(vertexCount)
  const vertexKeyToCanonical = new Map<string, number>()

  for (let i = 0; i < vertexCount; i++) {
    const kx = Math.round(position.getX(i) / POSITION_EPSILON)
    const ky = Math.round(position.getY(i) / POSITION_EPSILON)
    const kz = Math.round(position.getZ(i) / POSITION_EPSILON)
    const key = `${kx}_${ky}_${kz}`
    const existing = vertexKeyToCanonical.get(key)
    if (existing !== undefined) {
      canonicalIndex[i] = existing
    } else {
      vertexKeyToCanonical.set(key, i)
      canonicalIndex[i] = i
    }
  }

  const faceNormals: Array<{ x: number; y: number; z: number } | null> = faces.map(([a, b, c]) =>
    faceUnitNormal(a, b, c, position),
  )

  const edgeToFaces = new Map<string, number[]>()

  for (let fi = 0; fi < faces.length; fi++) {
    const [a, b, c] = faces[fi]
    const tri = [
      [canonicalIndex[a], canonicalIndex[b]],
      [canonicalIndex[b], canonicalIndex[c]],
      [canonicalIndex[c], canonicalIndex[a]],
    ] as const
    for (const [u, v] of tri) {
      if (u === v) continue
      const ek = canonicalEdgeKey(u, v)
      let list = edgeToFaces.get(ek)
      if (!list) {
        list = []
        edgeToFaces.set(ek, list)
      }
      list.push(fi)
    }
  }

  const segments: number[] = []

  for (const [ek, faceList] of edgeToFaces) {
    const uniqFaces = [...new Set(faceList)]
    const count = uniqFaces.length

    let include = false
    if (count === 1) {
      include = true
    } else if (count === 2) {
      const n0 = faceNormals[uniqFaces[0]]
      const n1 = faceNormals[uniqFaces[1]]
      if (n0 === null || n1 === null) {
        include = true
      } else {
        include = normalsSignificantCrease(n0, n1)
      }
    } else {
      include = true
    }

    if (!include) continue

    const sep = ek.indexOf('_')
    const ca = Number(ek.slice(0, sep))
    const cb = Number(ek.slice(sep + 1))
    segments.push(
      position.getX(ca),
      position.getY(ca),
      position.getZ(ca),
      position.getX(cb),
      position.getY(cb),
      position.getZ(cb),
    )
  }

  if (segments.length === 0) return null
  return new Float32Array(segments)
}
