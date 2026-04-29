/**
 * Rozciąganie siatki wzdłuż jednej osi między dwoma płaszczyznami złożonymi z wielu trójkątów (STL).
 * Zaznaczenie może zawierać całe „łaty” (np. prostokąt = 2 trójkąty) — grupy dzielimy po sąsiedztwie + współpłaszczyźnie.
 * Zakładamy: 1 jednostka = 1 mm (typowy eksport STL).
 */
import { BufferGeometry, Vector3 } from 'three'
import {
  clearMeshTopologyCaches,
  partitionSelectionIntoCoplanarPatches,
} from '../features/model-selection/facePlaneSelection'
import { replaceWithCreaseNormals } from './geometryCreaseNormals'

/** Minimalna odległość między płaszczyznami grup (mm). */
const MIN_GAP_MM = 1e-4

/** Minimalne |dot(n0,n1)| dla uznania ścian za równoległe. */
const PARALLEL_ABS_DOT_MIN = 0.92

export type TwoFaceStretchError =
  | 'notParallel'
  | 'tooThin'
  | 'invalidTarget'
  | 'invalidGeometry'
  | 'needSecondPlanarFace'
  | 'tooManyPlanarGroups'

export type TwoFaceStretchAnalysis = { ok: true; gapMm: number } | { ok: false; error: TwoFaceStretchError }

function triangleVertexIndices(geometry: BufferGeometry, faceIndex: number): [number, number, number] {
  const index = geometry.getIndex()
  if (index) {
    const base = faceIndex * 3
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
  }
  const ia = faceIndex * 3
  return [ia, ia + 1, ia + 2]
}

function triangleNormal(geometry: BufferGeometry, faceIndex: number, out: Vector3): Vector3 {
  const pos = geometry.getAttribute('position')
  if (!pos) {
    out.set(0, 0, 1)
    return out
  }
  const [ia, ib, ic] = triangleVertexIndices(geometry, faceIndex)
  const ax = pos.getX(ia)
  const ay = pos.getY(ia)
  const az = pos.getZ(ia)
  const bx = pos.getX(ib)
  const by = pos.getY(ib)
  const bz = pos.getZ(ib)
  const cx = pos.getX(ic)
  const cy = pos.getY(ic)
  const cz = pos.getZ(ic)
  const abx = bx - ax
  const aby = by - ay
  const abz = bz - az
  const acx = cx - ax
  const acy = cy - ay
  const acz = cz - az
  out.set(aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx)
  const len = out.length()
  if (len < 1e-15) {
    out.set(0, 0, 1)
  } else {
    out.divideScalar(len)
  }
  return out
}

function triangleCentroid(geometry: BufferGeometry, faceIndex: number, out: Vector3): Vector3 {
  const pos = geometry.getAttribute('position')
  if (!pos) {
    out.set(0, 0, 0)
    return out
  }
  const [ia, ib, ic] = triangleVertexIndices(geometry, faceIndex)
  out.set(
    (pos.getX(ia) + pos.getX(ib) + pos.getX(ic)) / 3,
    (pos.getY(ia) + pos.getY(ib) + pos.getY(ic)) / 3,
    (pos.getZ(ia) + pos.getZ(ib) + pos.getZ(ic)) / 3,
  )
  return out
}

function meanSignedDepth(
  geometry: BufferGeometry,
  faceIndex: number,
  origin: Vector3,
  axis: Vector3,
): number {
  const pos = geometry.getAttribute('position')
  if (!pos) return 0
  const [ia, ib, ic] = triangleVertexIndices(geometry, faceIndex)
  let s = 0
  for (const i of [ia, ib, ic]) {
    s += pos.getX(i) * axis.x + pos.getY(i) * axis.y + pos.getZ(i) * axis.z - origin.dot(axis)
  }
  return s / 3
}

function patchMeanCentroid(geometry: BufferGeometry, patch: readonly number[], out: Vector3): Vector3 {
  out.set(0, 0, 0)
  const c = new Vector3()
  for (const fi of patch) {
    triangleCentroid(geometry, fi, c)
    out.add(c)
  }
  out.divideScalar(patch.length)
  return out
}

function patchMeanNormal(geometry: BufferGeometry, patch: readonly number[], out: Vector3): Vector3 {
  out.set(0, 0, 0)
  const n = new Vector3()
  for (const fi of patch) {
    triangleNormal(geometry, fi, n)
    out.add(n)
  }
  if (out.lengthSq() < 1e-20) {
    out.set(0, 0, 1)
    return out
  }
  return out.normalize()
}

function patchMeanSignedDepth(
  geometry: BufferGeometry,
  patch: readonly number[],
  origin: Vector3,
  axis: Vector3,
): number {
  let s = 0
  for (const fi of patch) {
    s += meanSignedDepth(geometry, fi, origin, axis)
  }
  return s / patch.length
}

function computeAxisAndGapForPatches(
  geometry: BufferGeometry,
  patchA: readonly number[],
  patchB: readonly number[],
  c0: Vector3,
  c1: Vector3,
  n0: Vector3,
  n1: Vector3,
  axisOut: Vector3,
  scratch: Vector3,
): { gapSigned: number; h0: number } | null {
  if (Math.abs(n0.dot(n1)) < PARALLEL_ABS_DOT_MIN) {
    return null
  }

  axisOut.copy(n0)
  if (scratch.copy(c1).sub(c0).dot(axisOut) < 0) {
    axisOut.negate()
  }

  const h0 = patchMeanSignedDepth(geometry, patchA, c0, axisOut)
  const h1 = patchMeanSignedDepth(geometry, patchB, c0, axisOut)
  const gapSigned = h1 - h0

  if (Math.abs(gapSigned) < MIN_GAP_MM) {
    return null
  }

  return { gapSigned, h0 }
}

function resolvePatches(geometry: BufferGeometry, selectedFaces: readonly number[]): number[][] | null {
  const pos = geometry.getAttribute('position')
  if (!pos || pos.count < 3 || selectedFaces.length === 0) {
    return null
  }
  const patches = partitionSelectionIntoCoplanarPatches(geometry, selectedFaces)
  return patches
}

export function analyzeTwoFaceStretch(
  geometry: BufferGeometry,
  selectedFaces: readonly number[],
): TwoFaceStretchAnalysis {
  const patches = resolvePatches(geometry, selectedFaces)
  if (!patches) {
    return { ok: false, error: 'invalidGeometry' }
  }
  if (patches.length === 1) {
    return { ok: false, error: 'needSecondPlanarFace' }
  }
  if (patches.length > 2) {
    return { ok: false, error: 'tooManyPlanarGroups' }
  }

  const [patchA, patchB] = patches
  const c0 = new Vector3()
  const c1 = new Vector3()
  const n0 = new Vector3()
  const n1 = new Vector3()
  const axis = new Vector3()
  const scratch = new Vector3()

  patchMeanCentroid(geometry, patchA, c0)
  patchMeanCentroid(geometry, patchB, c1)
  patchMeanNormal(geometry, patchA, n0)
  patchMeanNormal(geometry, patchB, n1)

  const gapInfo = computeAxisAndGapForPatches(geometry, patchA, patchB, c0, c1, n0, n1, axis, scratch)
  if (!gapInfo) {
    const parallelOk = Math.abs(n0.dot(n1)) >= PARALLEL_ABS_DOT_MIN
    return { ok: false, error: parallelOk ? 'tooThin' : 'notParallel' }
  }

  return {
    ok: true,
    gapMm: Math.abs(gapInfo.gapSigned),
  }
}

export function applyTwoFaceStretch(
  geometry: BufferGeometry,
  selectedFaces: readonly number[],
  targetMm: number,
): { ok: true; geometry: BufferGeometry } | { ok: false; error: TwoFaceStretchError } {
  if (!Number.isFinite(targetMm) || targetMm <= 0) {
    return { ok: false, error: 'invalidTarget' }
  }

  const pos = geometry.getAttribute('position')
  if (!pos || pos.count < 3) {
    return { ok: false, error: 'invalidGeometry' }
  }

  const patches = resolvePatches(geometry, selectedFaces)
  if (!patches) {
    return { ok: false, error: 'invalidGeometry' }
  }
  if (patches.length === 1) {
    return { ok: false, error: 'needSecondPlanarFace' }
  }
  if (patches.length > 2) {
    return { ok: false, error: 'tooManyPlanarGroups' }
  }

  const [patchA, patchB] = patches
  const c0 = new Vector3()
  const c1 = new Vector3()
  const n0 = new Vector3()
  const n1 = new Vector3()
  const axis = new Vector3()
  const scratch = new Vector3()

  patchMeanCentroid(geometry, patchA, c0)
  patchMeanCentroid(geometry, patchB, c1)
  patchMeanNormal(geometry, patchA, n0)
  patchMeanNormal(geometry, patchB, n1)

  const gapInfo = computeAxisAndGapForPatches(geometry, patchA, patchB, c0, c1, n0, n1, axis, scratch)
  if (!gapInfo) {
    const parallelOk = Math.abs(n0.dot(n1)) >= PARALLEL_ABS_DOT_MIN
    return { ok: false, error: parallelOk ? 'tooThin' : 'notParallel' }
  }

  const { gapSigned, h0 } = gapInfo
  const ratio = targetMm / Math.abs(gapSigned)

  const count = pos.count
  const ox = c0.x
  const oy = c0.y
  const oz = c0.z
  const ux = axis.x
  const uy = axis.y
  const uz = axis.z

  for (let i = 0; i < count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i)
    const vz = pos.getZ(i)
    const h = (vx - ox) * ux + (vy - oy) * uy + (vz - oz) * uz
    const hNew = h0 + (h - h0) * ratio
    const delta = hNew - h
    pos.setXYZ(i, vx + delta * ux, vy + delta * uy, vz + delta * uz)
  }

  pos.needsUpdate = true
  const geo = replaceWithCreaseNormals(geometry)
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  clearMeshTopologyCaches(geo)

  return { ok: true, geometry: geo }
}
