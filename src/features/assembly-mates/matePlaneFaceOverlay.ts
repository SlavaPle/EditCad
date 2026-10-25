import {
  BufferAttribute,
  BufferGeometry,
  type InterleavedBufferAttribute,
} from 'three'
import { ellipseCenterFromVertexChain } from '../model-selection/edgeEllipseSelection'
import type {
  MateCurvedPlaneRef,
  MateEllipseCenterRef,
  MateEllipseRef,
  MateEntityRef,
  MateLineRef,
  MatePlaneRef,
  MateVertexRef,
} from './model'
import {
  asMateCurvedPlaneRef,
  asMateEllipseCenterRef,
  asMateEllipseRef,
  asMateLineRef,
  asMatePlaneRef,
  asMateVertexRef,
} from './mateEntityRef'

export type MatePlaneHighlights = {
  planeA: MatePlaneRef | null
  planeB: MatePlaneRef | null
}

export type MateEntityHighlights = {
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
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

function faceIndicesForSurfaceEntity(
  partId: string,
  entity: MateEntityRef | null,
): readonly number[] | null {
  if (!entity || entity.partId !== partId) return null
  const plane = asMatePlaneRef(entity)
  if (plane) return plane.faceIndices
  const curved = asMateCurvedPlaneRef(entity)
  if (curved) return curved.faceIndices
  return null
}

export function matePlaneHighlightsForPart(
  partId: string,
  highlights: MatePlaneHighlights | MateEntityHighlights | null | undefined,
): { planeA: readonly number[] | null; planeB: readonly number[] | null } {
  if (!highlights) return { planeA: null, planeB: null }
  if ('entityA' in highlights) {
    return {
      planeA: faceIndicesForSurfaceEntity(partId, highlights.entityA),
      planeB: faceIndicesForSurfaceEntity(partId, highlights.entityB),
    }
  }
  return {
    planeA:
      highlights.planeA?.partId === partId ? highlights.planeA.faceIndices : null,
    planeB:
      highlights.planeB?.partId === partId ? highlights.planeB.faceIndices : null,
  }
}

export function mateLineHighlightsForPart(
  partId: string,
  highlights: MateEntityHighlights | null | undefined,
): { lineA: MateLineRef | null; lineB: MateLineRef | null } {
  if (!highlights) {
    return { lineA: null, lineB: null }
  }
  const lineA = highlights.entityA ? asMateLineRef(highlights.entityA) : null
  const lineB = highlights.entityB ? asMateLineRef(highlights.entityB) : null
  return {
    lineA: lineA?.partId === partId ? lineA : null,
    lineB: lineB?.partId === partId ? lineB : null,
  }
}

export function mateVertexHighlightsForPart(
  partId: string,
  highlights: MateEntityHighlights | null | undefined,
): { vertexA: MateVertexRef | null; vertexB: MateVertexRef | null } {
  if (!highlights) {
    return { vertexA: null, vertexB: null }
  }
  let vertexA = highlights.entityA ? asMateVertexRef(highlights.entityA) : null
  let vertexB = highlights.entityB ? asMateVertexRef(highlights.entityB) : null
  if (vertexA?.partId !== partId) vertexA = null
  if (vertexB?.partId !== partId) vertexB = null

  const curvedA = highlights.entityA ? asMateCurvedPlaneRef(highlights.entityA) : null
  const curvedB = highlights.entityB ? asMateCurvedPlaneRef(highlights.entityB) : null
  if (!vertexA && curvedA?.partId === partId && curvedA.apexVertexIndex !== undefined) {
    vertexA = {
      kind: 'vertex',
      partId,
      vertexIndex: curvedA.apexVertexIndex,
    }
  }
  if (!vertexB && curvedB?.partId === partId && curvedB.apexVertexIndex !== undefined) {
    vertexB = {
      kind: 'vertex',
      partId,
      vertexIndex: curvedB.apexVertexIndex,
    }
  }

  return { vertexA, vertexB }
}

function ellipseFromCurvedArc(
  partId: string,
  curved: MateCurvedPlaneRef,
  which: 'arcA' | 'arcB',
): MateEllipseRef | null {
  const arc = which === 'arcA' ? curved.arcA : curved.arcB
  if (!arc) return null
  return {
    kind: 'ellipse',
    partId,
    vertexIndices: arc.vertexIndices,
    closed: arc.closed,
  }
}

/**
 * Elipsy do overlay: bezpośrednie MateEllipseRef (bez łuków curvedPlane —
 * te idą w mateCurvedBoundaryEllipsesForPart, oba w kolorze swojego slotu).
 */
export function mateEllipseHighlightsForPart(
  partId: string,
  highlights: MateEntityHighlights | null | undefined,
): { ellipseA: MateEllipseRef | null; ellipseB: MateEllipseRef | null } {
  if (!highlights) {
    return { ellipseA: null, ellipseB: null }
  }
  let ellipseA = highlights.entityA ? asMateEllipseRef(highlights.entityA) : null
  let ellipseB = highlights.entityB ? asMateEllipseRef(highlights.entityB) : null
  if (ellipseA?.partId !== partId) ellipseA = null
  if (ellipseB?.partId !== partId) ellipseB = null
  return { ellipseA, ellipseB }
}

function curvedBoundaryEllipses(
  partId: string,
  curved: MateCurvedPlaneRef,
): MateEllipseRef[] {
  const out: MateEllipseRef[] = []
  const a = ellipseFromCurvedArc(partId, curved, 'arcA')
  if (a) out.push(a)
  const b = ellipseFromCurvedArc(partId, curved, 'arcB')
  if (b) out.push(b)
  return out
}

/**
 * Oba łuki curvedPlane w kolorze slotu entity (nie mieszaj arcB do slotu B).
 */
export function mateCurvedBoundaryEllipsesForPart(
  partId: string,
  highlights: MateEntityHighlights | null | undefined,
): { ellipsesA: MateEllipseRef[]; ellipsesB: MateEllipseRef[] } {
  if (!highlights) return { ellipsesA: [], ellipsesB: [] }
  const curvedA = highlights.entityA ? asMateCurvedPlaneRef(highlights.entityA) : null
  const curvedB = highlights.entityB ? asMateCurvedPlaneRef(highlights.entityB) : null
  return {
    ellipsesA: curvedA?.partId === partId ? curvedBoundaryEllipses(partId, curvedA) : [],
    ellipsesB: curvedB?.partId === partId ? curvedBoundaryEllipses(partId, curvedB) : [],
  }
}

export function mateEllipseCenterHighlightsForPart(
  partId: string,
  highlights: MateEntityHighlights | null | undefined,
): { centerA: MateEllipseCenterRef | null; centerB: MateEllipseCenterRef | null } {
  if (!highlights) {
    return { centerA: null, centerB: null }
  }
  const centerA = highlights.entityA ? asMateEllipseCenterRef(highlights.entityA) : null
  const centerB = highlights.entityB ? asMateEllipseCenterRef(highlights.entityB) : null
  return {
    centerA: centerA?.partId === partId ? centerA : null,
    centerB: centerB?.partId === partId ? centerB : null,
  }
}

export type MateCurvedAxisLocal = {
  from: [number, number, number]
  to: [number, number, number]
}

function curvedAxisFromRef(
  geometry: BufferGeometry,
  curved: MateCurvedPlaneRef,
): MateCurvedAxisLocal | null {
  const cA = ellipseCenterFromVertexChain(geometry, curved.arcA.vertexIndices)?.center
  if (!cA) return null
  if (curved.arcB) {
    const cB = ellipseCenterFromVertexChain(geometry, curved.arcB.vertexIndices)?.center
    if (!cB) return null
    return { from: cA, to: cB }
  }
  if (curved.apexVertexIndex !== undefined) {
    const position = geometry.getAttribute('position')
    const vi = curved.apexVertexIndex
    if (!position || vi < 0 || vi >= position.count) return null
    return {
      from: cA,
      to: [position.getX(vi), position.getY(vi), position.getZ(vi)],
    }
  }
  return null
}

/** Oś walca/stożka: odcinek między środkami łuków (lub środek → apex). */
export function mateCurvedAxisHighlightsForPart(
  partId: string,
  geometry: BufferGeometry,
  highlights: MateEntityHighlights | null | undefined,
): { axisA: MateCurvedAxisLocal | null; axisB: MateCurvedAxisLocal | null } {
  if (!highlights) return { axisA: null, axisB: null }
  const curvedA = highlights.entityA ? asMateCurvedPlaneRef(highlights.entityA) : null
  const curvedB = highlights.entityB ? asMateCurvedPlaneRef(highlights.entityB) : null
  return {
    axisA: curvedA?.partId === partId ? curvedAxisFromRef(geometry, curvedA) : null,
    axisB: curvedB?.partId === partId ? curvedAxisFromRef(geometry, curvedB) : null,
  }
}

export function buildMatePlaneHighlightsForPopup(
  popupOpen: boolean,
  planeA: MatePlaneRef | null,
  planeB: MatePlaneRef | null,
): MatePlaneHighlights | null {
  if (!popupOpen) return null
  return { planeA, planeB }
}

export function buildMateEntityHighlightsForPopup(
  popupOpen: boolean,
  entityA: MateEntityRef | null,
  entityB: MateEntityRef | null,
): MateEntityHighlights | null {
  if (!popupOpen) return null
  return { entityA, entityB }
}

export function hasMatePlaneHighlights(
  highlights: MatePlaneHighlights | MateEntityHighlights | null | undefined,
): boolean {
  if (!highlights) return false
  if ('entityA' in highlights) {
    return !!(highlights.entityA || highlights.entityB)
  }
  return !!(highlights.planeA || highlights.planeB)
}
