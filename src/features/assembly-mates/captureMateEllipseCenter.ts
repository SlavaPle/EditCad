import type { BufferGeometry } from 'three'
import {
  ellipseCenterFromVertexChain,
  isLocalPointNearEllipseCenter,
  trySelectEllipseFromEdge,
  trySelectEllipseFromVertex,
  type EllipseChainResult,
} from '../model-selection/edgeEllipseSelection'
import type { MateEllipseCenterRef } from './model'

export type CaptureMateEllipseCenterResult =
  | { ok: true; center: MateEllipseCenterRef }
  | { ok: false; reason: 'notNearCenter' | 'notEllipse' }

function toCenterRef(
  partId: string,
  selected: Pick<EllipseChainResult, 'vertexIndices' | 'closed'>,
): MateEllipseCenterRef {
  return {
    kind: 'ellipseCenter',
    partId,
    vertexIndices: selected.vertexIndices,
    closed: selected.closed,
  }
}

/**
 * Gdy wskaźnik jest blisko środka dopasowanej elipsy — wybór punktu (centrum),
 * zamiast całego łuku.
 */
export function captureMateEllipseCenterAtLocalPoint(
  partId: string,
  geometry: BufferGeometry,
  localPoint: { x: number; y: number; z: number },
  seed: { type: 'edge'; a: number; b: number } | { type: 'vertex'; index: number },
): CaptureMateEllipseCenterResult {
  const selected =
    seed.type === 'edge'
      ? trySelectEllipseFromEdge(geometry, seed.a, seed.b)
      : trySelectEllipseFromVertex(geometry, seed.index)
  if (!selected) {
    return { ok: false, reason: 'notEllipse' }
  }
  const fitted = ellipseCenterFromVertexChain(geometry, selected.vertexIndices)
  if (!fitted || !isLocalPointNearEllipseCenter(localPoint, fitted)) {
    return { ok: false, reason: 'notNearCenter' }
  }
  return { ok: true, center: toCenterRef(partId, selected) }
}
