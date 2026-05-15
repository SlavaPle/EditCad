import type { BufferGeometry } from 'three'
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

/** Unikalne krawędzie siatki (wierzchołki kanoniczne) jako pary segmentów dla FatLineSegments. */
export function buildMeshEdgeLinePositions(geometry: BufferGeometry): Float32Array | null {
  const position = geometry.getAttribute('position')
  if (!position) return null

  const faces = getFaceVertices(geometry)
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

  const seen = new Set<string>()
  const segments: number[] = []

  const addEdge = (a: number, b: number) => {
    const ca = canonicalIndex[a]
    const cb = canonicalIndex[b]
    const key = ca < cb ? `${ca}_${cb}` : `${cb}_${ca}`
    if (seen.has(key)) return
    seen.add(key)
    segments.push(
      position.getX(ca),
      position.getY(ca),
      position.getZ(ca),
      position.getX(cb),
      position.getY(cb),
      position.getZ(cb),
    )
  }

  for (const [a, b, c] of faces) {
    addEdge(a, b)
    addEdge(b, c)
    addEdge(c, a)
  }

  if (segments.length === 0) return null
  return new Float32Array(segments)
}
