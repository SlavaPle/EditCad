import { Vector2, Vector3, type BufferGeometry, type Camera, type Object3D } from 'three'
import {
  areFacesCoplanarForMeshEdgeCrease,
  findFarthestOppositeCoplanarFaces,
  getCoplanarConnectedFaces,
} from './facePlaneSelection'
import { edgePickToleranceFromGeometry } from './edgeLineSelection'
import {
  getIncidentFaceIndicesForEdge,
  isIndexedEdgeACrease,
  pickClosestCreasedTriangleEdge,
} from './edgeCreaseSelection'
import { pickClosestTriangleVertex } from './vertexPointSelection'
import type { ModelSelectionProximityFilter } from './types'

/** Wynik „najbliższego” elementu pod kursorem (lokalne współrzędne siatki) */
export type ProximityPickResult =
  | { type: 'none' }
  | { type: 'faces'; indices: readonly number[]; probableIndices?: readonly number[] }
  | { type: 'edge'; a: number; b: number }
  | { type: 'vertex'; index: number }

export type ProximityPickScreenContext = {
  camera: Camera
  mesh: Object3D
  pointer: { x: number; y: number }
  viewport: { width: number; height: number }
}

const SCREEN_VERTEX_TOLERANCE_PX = 14
const SCREEN_EDGE_TOLERANCE_PX = 10

const scratchV0 = new Vector3()
const scratchV1 = new Vector3()
const scratchV2 = new Vector3()
const scratchScreen0 = new Vector2()
const scratchScreen1 = new Vector2()
const scratchScreen2 = new Vector2()

function triangleVertexIndices(geometry: BufferGeometry, faceIndex: number): [number, number, number] {
  const index = geometry.getIndex()
  if (index) {
    const base = faceIndex * 3
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
  }
  const ia = faceIndex * 3
  return [ia, ia + 1, ia + 2]
}

function worldToScreenPx(
  worldPoint: Vector3,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
  out: Vector2,
): Vector2 {
  const ndc = worldPoint.clone().project(camera)
  out.set((ndc.x * 0.5 + 0.5) * viewportWidth, (-ndc.y * 0.5 + 0.5) * viewportHeight)
  return out
}

function distSqPointToSegment2D(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const abLenSq = abx * abx + aby * aby
  if (abLenSq <= 1e-12) {
    return apx * apx + apy * apy
  }
  let t = (apx * abx + apy * aby) / abLenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * abx
  const cy = ay + t * aby
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy
}

function pickInScreenSpace(
  geometry: BufferGeometry,
  faceIndex: number,
  screen: ProximityPickScreenContext,
  filter: ModelSelectionProximityFilter,
): ProximityPickResult | null {
  const position = geometry.getAttribute('position')
  if (!position || screen.viewport.width <= 0 || screen.viewport.height <= 0) {
    return null
  }
  const [ia, ib, ic] = triangleVertexIndices(geometry, faceIndex)
  const camera = screen.camera
  const mesh = screen.mesh

  mesh.localToWorld(scratchV0.set(position.getX(ia), position.getY(ia), position.getZ(ia)))
  mesh.localToWorld(scratchV1.set(position.getX(ib), position.getY(ib), position.getZ(ib)))
  mesh.localToWorld(scratchV2.set(position.getX(ic), position.getY(ic), position.getZ(ic)))

  worldToScreenPx(scratchV0, camera, screen.viewport.width, screen.viewport.height, scratchScreen0)
  worldToScreenPx(scratchV1, camera, screen.viewport.width, screen.viewport.height, scratchScreen1)
  worldToScreenPx(scratchV2, camera, screen.viewport.width, screen.viewport.height, scratchScreen2)

  const px = screen.pointer.x
  const py = screen.pointer.y

  if (filter.vertex) {
    const candidates: Array<{ index: number; dSq: number }> = [
      { index: ia, dSq: (scratchScreen0.x - px) ** 2 + (scratchScreen0.y - py) ** 2 },
      { index: ib, dSq: (scratchScreen1.x - px) ** 2 + (scratchScreen1.y - py) ** 2 },
      { index: ic, dSq: (scratchScreen2.x - px) ** 2 + (scratchScreen2.y - py) ** 2 },
    ].sort((a, b) => a.dSq - b.dSq)
    const bestVertex = candidates[0]
    if (bestVertex && bestVertex.dSq <= SCREEN_VERTEX_TOLERANCE_PX * SCREEN_VERTEX_TOLERANCE_PX) {
      return { type: 'vertex', index: bestVertex.index }
    }
  }

  if (filter.edgeLine) {
    const candidates = [
      { a: ia, b: ib, pa: scratchScreen0, pb: scratchScreen1 },
      { a: ib, b: ic, pa: scratchScreen1, pb: scratchScreen2 },
      { a: ic, b: ia, pa: scratchScreen2, pb: scratchScreen0 },
    ]
      .filter((e) => isIndexedEdgeACrease(geometry, e.a, e.b))
      .map((e) => ({
        a: e.a,
        b: e.b,
        dSq: distSqPointToSegment2D(px, py, e.pa.x, e.pa.y, e.pb.x, e.pb.y),
      }))
      .sort((a, b) => a.dSq - b.dSq)

    const bestEdge = candidates[0]
    if (bestEdge && bestEdge.dSq <= SCREEN_EDGE_TOLERANCE_PX * SCREEN_EDGE_TOLERANCE_PX) {
      const inc = getIncidentFaceIndicesForEdge(geometry, bestEdge.a, bestEdge.b)
      const triangulationInterior =
        inc.length === 2 && areFacesCoplanarForMeshEdgeCrease(geometry, inc[0], inc[1])
      if (!triangulationInterior) {
        return { type: 'edge', a: bestEdge.a, b: bestEdge.b }
      }
    }
  }

  return null
}

/** Kolejność: wierzchołek → stryk → łata płaszczyzny; progi z AABB. */
export function resolveProximityPick(
  geometry: BufferGeometry,
  faceIndex: number,
  localPoint: Vector3,
  filter: ModelSelectionProximityFilter,
  screen?: ProximityPickScreenContext,
): ProximityPickResult {
  if (screen) {
    const screenPick = pickInScreenSpace(geometry, faceIndex, screen, filter)
    if (screenPick && screenPick.type !== 'none') {
      return screenPick
    }
  }

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
      const inc = getIncidentFaceIndicesForEdge(geometry, e.a, e.b)
      const triangulationInterior =
        inc.length === 2 && areFacesCoplanarForMeshEdgeCrease(geometry, inc[0], inc[1])
      if (!triangulationInterior) {
        return { type: 'edge', a: e.a, b: e.b }
      }
    }
  }

  if (filter.facePlane) {
    const faces = getCoplanarConnectedFaces(geometry, faceIndex)
    const oppositeFaces = findFarthestOppositeCoplanarFaces(geometry, faceIndex)
    if (oppositeFaces.length === 0) return { type: 'faces', indices: faces }
    return { type: 'faces', indices: faces, probableIndices: oppositeFaces }
  }

  return { type: 'none' }
}
