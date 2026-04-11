import type { Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import { getCoplanarConnectedFaces } from './facePlaneSelection'
import { edgePickToleranceFromGeometry } from './edgeLineSelection'
import { pickClosestCreasedTriangleEdge } from './edgeCreaseSelection'
import { pickClosestTriangleVertex } from './vertexPointSelection'
import type { ModelSelectionProximityFilter } from './types'

/** Wynik „najbliższego” elementu pod kursorem (lokalne współrzędne siatki) */
export type ProximityPickResult =
  | { type: 'none' }
  | { type: 'faces'; indices: readonly number[] }
  | { type: 'edge'; a: number; b: number }
  | { type: 'vertex'; index: number }

/**
 * Kolejność: wierzchołek → strykowa krawędź → kompakt płaszczyzny (jak wcześniej „face plane”).
 * Progi z AABB siatki (jak w osobnych trybach).
 */
export function resolveProximityPick(
  geometry: BufferGeometry,
  faceIndex: number,
  localPoint: Vector3,
  filter: ModelSelectionProximityFilter,
): ProximityPickResult {
  const tolV = edgePickToleranceFromGeometry(geometry, 0.03)
  const tolE = edgePickToleranceFromGeometry(geometry)

  if (filter.vertex) {
    const v = pickClosestTriangleVertex(geometry, faceIndex, localPoint, tolV)
    if (v !== null) {
      return { type: 'vertex', index: v }
    }
  }

  if (filter.edgeLine) {
    const e = pickClosestCreasedTriangleEdge(geometry, faceIndex, localPoint, tolE)
    if (e !== null) {
      return { type: 'edge', a: e.a, b: e.b }
    }
  }

  if (filter.facePlane) {
    const faces = getCoplanarConnectedFaces(geometry, faceIndex)
    return { type: 'faces', indices: faces }
  }

  return { type: 'none' }
}
