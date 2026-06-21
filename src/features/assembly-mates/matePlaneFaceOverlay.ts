import {
  BufferAttribute,
  BufferGeometry,
  type InterleavedBufferAttribute,
} from 'three'

export type MatePlaneHighlights = {
  planeA: { partId: string; faceIndices: readonly number[] } | null
  planeB: { partId: string; faceIndices: readonly number[] } | null
}

export const MATE_PLANE_OVERLAY = {
  planeA: { color: '#60a5fa', opacity: 0.34 },
  planeB: { color: '#fbbf24', opacity: 0.34 },
} as const

function triangleIndicesForFace(geometry: BufferGeometry, faceIndex: number): [number, number, number] {
  const index = geometry.getIndex()
  if (index) {
    const base = faceIndex * 3
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
  }
  const ia = faceIndex * 3
  return [ia, ia + 1, ia + 2]
}

function pushOverlayTriangle(
  position: BufferAttribute | InterleavedBufferAttribute,
  ia: number,
  ib: number,
  ic: number,
  triIndex: number,
  depthStep: number,
  out: Float32Array,
  w: number,
): number {
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
  const off = (1 + triIndex) * depthStep
  if (len < 1e-22) {
    out[w++] = ax
    out[w++] = ay
    out[w++] = az
    out[w++] = bx
    out[w++] = by
    out[w++] = bz
    out[w++] = cx
    out[w++] = cy
    out[w++] = cz
    return w
  }
  nx = (nx / len) * off
  ny = (ny / len) * off
  nz = (nz / len) * off
  out[w++] = ax + nx
  out[w++] = ay + ny
  out[w++] = az + nz
  out[w++] = bx + nx
  out[w++] = by + ny
  out[w++] = bz + nz
  out[w++] = cx + nx
  out[w++] = cy + ny
  out[w++] = cz + nz
  return w
}

/** Siatka półprzezroczystego overlaya dla łaty trójkątów płaszczyzny mate. */
export function buildMatePlaneFaceOverlayGeometry(
  geometry: BufferGeometry,
  faceIndices: readonly number[],
): BufferGeometry | null {
  if (faceIndices.length === 0) return null
  const position = geometry.getAttribute('position')
  if (!position) return null

  if (!geometry.boundingSphere) geometry.computeBoundingSphere()
  const depthStep = Math.max(1e-6, (geometry.boundingSphere?.radius ?? 1) * 1e-7)

  const arr = new Float32Array(faceIndices.length * 9)
  let w = 0
  let triIdx = 0
  for (const fi of faceIndices) {
    if (fi < 0) continue
    const [ia, ib, ic] = triangleIndicesForFace(geometry, fi)
    if (ia < 0 || ib < 0 || ic < 0 || ia >= position.count || ib >= position.count || ic >= position.count) {
      continue
    }
    w = pushOverlayTriangle(position, ia, ib, ic, triIdx++, depthStep, arr, w)
  }
  if (w === 0) return null

  const overlay = new BufferGeometry()
  overlay.setAttribute('position', new BufferAttribute(arr.subarray(0, w), 3))
  return overlay
}

export function matePlaneHighlightsForPart(
  partId: string,
  highlights: MatePlaneHighlights | null | undefined,
): { planeA: readonly number[] | null; planeB: readonly number[] | null } {
  if (!highlights) return { planeA: null, planeB: null }
  return {
    planeA:
      highlights.planeA?.partId === partId ? highlights.planeA.faceIndices : null,
    planeB:
      highlights.planeB?.partId === partId ? highlights.planeB.faceIndices : null,
  }
}
