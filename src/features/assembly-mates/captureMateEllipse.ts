import type { BufferGeometry } from 'three'
import {
  trySelectEllipseFromEdge,
  trySelectEllipseFromVertex,
} from '../model-selection/edgeEllipseSelection'
import type { MateEllipseRef } from './model'

export type CaptureMateEllipseResult =
  | { ok: true; ellipse: MateEllipseRef }
  | { ok: false; reason: 'invalidEdge' | 'invalidVertex' | 'notEllipse' }

function toMateEllipse(
  partId: string,
  selected: { vertexIndices: readonly number[]; closed: boolean },
): MateEllipseRef {
  return {
    kind: 'ellipse',
    partId,
    vertexIndices: [...selected.vertexIndices],
    closed: selected.closed,
  }
}

/**
 * Z krawędzi-seed: łańcuch łuku / okręgu / elipsy (także częściowy).
 * Gdy fit się nie uda — caller powinien spaść na zwykłą linię.
 */
export function captureMateEllipse(
  partId: string,
  geometry: BufferGeometry,
  vertexA: number,
  vertexB: number,
): CaptureMateEllipseResult {
  if (
    !Number.isInteger(vertexA) ||
    !Number.isInteger(vertexB) ||
    vertexA < 0 ||
    vertexB < 0 ||
    vertexA === vertexB
  ) {
    return { ok: false, reason: 'invalidEdge' }
  }

  const selected = trySelectEllipseFromEdge(geometry, vertexA, vertexB)
  if (!selected) {
    return { ok: false, reason: 'notEllipse' }
  }

  return { ok: true, ellipse: toMateEllipse(partId, selected) }
}

/** Seed w wierzchołku (krótkie odcinki łuku — proximity często trafia w punkt). */
export function captureMateEllipseFromVertex(
  partId: string,
  geometry: BufferGeometry,
  vertexIndex: number,
): CaptureMateEllipseResult {
  if (!Number.isInteger(vertexIndex) || vertexIndex < 0) {
    return { ok: false, reason: 'invalidVertex' }
  }
  const selected = trySelectEllipseFromVertex(geometry, vertexIndex)
  if (!selected) {
    return { ok: false, reason: 'notEllipse' }
  }
  return { ok: true, ellipse: toMateEllipse(partId, selected) }
}
