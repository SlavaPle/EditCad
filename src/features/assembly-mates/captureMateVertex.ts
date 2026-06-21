import type { BufferGeometry } from 'three'
import type { MateVertexRef } from './model'

export type CaptureMateVertexResult =
  | { ok: true; vertex: MateVertexRef }
  | { ok: false; reason: 'invalidVertex' }

/** Pojedynczy wierzchołek siatki na detalu programu. */
export function captureMateVertex(
  partId: string,
  geometry: BufferGeometry,
  vertexIndex: number,
): CaptureMateVertexResult {
  const position = geometry.getAttribute('position')
  if (
    !position ||
    !Number.isInteger(vertexIndex) ||
    vertexIndex < 0 ||
    vertexIndex >= position.count
  ) {
    return { ok: false, reason: 'invalidVertex' }
  }

  return {
    ok: true,
    vertex: {
      kind: 'vertex',
      partId,
      vertexIndex,
    },
  }
}
