import { Vector2, Vector3, type BufferGeometry, type Camera } from 'three'
import { edgePickToleranceFromGeometry, pickClosestTriangleEdge } from '../model-selection/edgeLineSelection'
import type { ProximityPickScreenContext } from '../model-selection/proximityPick'

const MATE_LINE_SCREEN_TOLERANCE_PX = 12

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

function pickTriangleEdgeInScreenSpace(
  geometry: BufferGeometry,
  faceIndex: number,
  screen: ProximityPickScreenContext,
): { a: number; b: number } | null {
  const position = geometry.getAttribute('position')
  if (!position || screen.viewport.width <= 0 || screen.viewport.height <= 0) {
    return null
  }

  const [ia, ib, ic] = triangleVertexIndices(geometry, faceIndex)
  const mesh = screen.mesh
  const camera = screen.camera

  mesh.localToWorld(scratchV0.set(position.getX(ia), position.getY(ia), position.getZ(ia)))
  mesh.localToWorld(scratchV1.set(position.getX(ib), position.getY(ib), position.getZ(ib)))
  mesh.localToWorld(scratchV2.set(position.getX(ic), position.getY(ic), position.getZ(ic)))

  worldToScreenPx(scratchV0, camera, screen.viewport.width, screen.viewport.height, scratchScreen0)
  worldToScreenPx(scratchV1, camera, screen.viewport.width, screen.viewport.height, scratchScreen1)
  worldToScreenPx(scratchV2, camera, screen.viewport.width, screen.viewport.height, scratchScreen2)

  const px = screen.pointer.x
  const py = screen.pointer.y
  const maxSq = MATE_LINE_SCREEN_TOLERANCE_PX * MATE_LINE_SCREEN_TOLERANCE_PX

  const candidates = [
    { a: ia, b: ib, dSq: distSqPointToSegment2D(px, py, scratchScreen0.x, scratchScreen0.y, scratchScreen1.x, scratchScreen1.y) },
    { a: ib, b: ic, dSq: distSqPointToSegment2D(px, py, scratchScreen1.x, scratchScreen1.y, scratchScreen2.x, scratchScreen2.y) },
    { a: ic, b: ia, dSq: distSqPointToSegment2D(px, py, scratchScreen2.x, scratchScreen2.y, scratchScreen0.x, scratchScreen0.y) },
  ].sort((left, right) => left.dSq - right.dSq)

  const best = candidates[0]
  if (!best || best.dSq > maxSq) return null
  return { a: best.a, b: best.b }
}

/** Wybór krawędzi pod kursorem — bez filtra crease (dowolne widoczne ramię trójkąta). */
export function pickMateLineEdge(
  geometry: BufferGeometry,
  faceIndex: number,
  localPoint: Vector3,
  screen?: ProximityPickScreenContext,
): { a: number; b: number } | null {
  if (screen) {
    const screenEdge = pickTriangleEdgeInScreenSpace(geometry, faceIndex, screen)
    if (screenEdge) return screenEdge
  }

  const tol = edgePickToleranceFromGeometry(geometry)
  return pickClosestTriangleEdge(geometry, faceIndex, localPoint, tol)
}
