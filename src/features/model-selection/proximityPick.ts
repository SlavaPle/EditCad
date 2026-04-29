import { Vector2, Vector3, type BufferGeometry, type Camera, type Object3D } from 'three'
import {
  areFacesCoplanarForMeshEdgeCrease,
  getFaceVertices,
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
  | { type: 'edge'; a: number; b: number; probableFaceIndices?: readonly number[] }
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
const EDGE_PERP_DOT_MIN = 0.9
const PATCH_PARALLEL_DOT_MIN = 0.9
const POSITION_EPSILON = 1e-5

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
        const probableFaceIndices = resolveParallelExtremeFacesForEdge(geometry, bestEdge.a, bestEdge.b)
        return probableFaceIndices.length > 0
          ? { type: 'edge', a: bestEdge.a, b: bestEdge.b, probableFaceIndices }
          : { type: 'edge', a: bestEdge.a, b: bestEdge.b }
      }
    }
  }

  return null
}

function resolveParallelExtremeFacesForEdge(
  geometry: BufferGeometry,
  edgeA: number,
  edgeB: number,
): readonly number[] {
  const position = geometry.getAttribute('position')
  if (!position) return []
  const faces = getFaceVertices(geometry)
  const canonicalKey = (vertexIndex: number): string => {
    const x = position.getX(vertexIndex)
    const y = position.getY(vertexIndex)
    const z = position.getZ(vertexIndex)
    const kx = Math.round(x / POSITION_EPSILON)
    const ky = Math.round(y / POSITION_EPSILON)
    const kz = Math.round(z / POSITION_EPSILON)
    return `${kx}_${ky}_${kz}`
  }
  const edgeAKey = canonicalKey(edgeA)
  const edgeBKey = canonicalKey(edgeB)

  const edgeDir = new Vector3(
    position.getX(edgeB) - position.getX(edgeA),
    position.getY(edgeB) - position.getY(edgeA),
    position.getZ(edgeB) - position.getZ(edgeA),
  )
  if (edgeDir.lengthSq() < 1e-20) return []
  edgeDir.normalize()

  const vertexIncidentFacesA: number[] = []
  const vertexIncidentFacesB: number[] = []
  for (let fi = 0; fi < faces.length; fi++) {
    const [va, vb, vc] = faces[fi]
    const ka = canonicalKey(va)
    const kb = canonicalKey(vb)
    const kc = canonicalKey(vc)
    if (ka === edgeAKey || kb === edgeAKey || kc === edgeAKey) vertexIncidentFacesA.push(fi)
    if (ka === edgeBKey || kb === edgeBKey || kc === edgeBKey) vertexIncidentFacesB.push(fi)
  }
  if (vertexIncidentFacesA.length === 0 || vertexIncidentFacesB.length === 0) return []

  const normalForFace = (faceIndex: number): Vector3 => {
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
    const n = new Vector3(aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx)
    if (n.lengthSq() < 1e-20) return new Vector3()
    return n.normalize()
  }

  const bestPatchAtVertex = (incidentFaces: readonly number[]) => {
    const visited = new Set<number>()
    let best: { patch: number[]; normal: Vector3; score: number } | null = null
    for (const faceIndex of incidentFaces) {
      if (visited.has(faceIndex)) continue
      const patch = getCoplanarConnectedFaces(geometry, faceIndex)
      for (const fi of patch) visited.add(fi)
      const n = normalForFace(faceIndex)
      const align = Math.abs(n.dot(edgeDir))
      if (align < EDGE_PERP_DOT_MIN) continue
      const score = patch.length * 10 + align
      if (!best || score > best.score) {
        best = { patch, normal: n, score }
      }
    }
    return best
  }

  const a = bestPatchAtVertex(vertexIncidentFacesA)
  const b = bestPatchAtVertex(vertexIncidentFacesB)
  if (!a || !b) return []
  if (Math.abs(a.normal.dot(b.normal)) < PATCH_PARALLEL_DOT_MIN) return []

  const out = [...a.patch]
  const seen = new Set(out)
  for (const fi of b.patch) {
    if (!seen.has(fi)) out.push(fi)
  }
  return out
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
        const probableFaceIndices = resolveParallelExtremeFacesForEdge(geometry, e.a, e.b)
        return probableFaceIndices.length > 0
          ? { type: 'edge', a: e.a, b: e.b, probableFaceIndices }
          : { type: 'edge', a: e.a, b: e.b }
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
