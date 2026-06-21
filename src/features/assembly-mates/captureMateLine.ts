import type { BufferGeometry } from 'three'
import { normalizeMateLineVertices } from './mateEntityRef'
import type { MateLineRef } from './model'

export type CaptureMateLineResult =
  | { ok: true; line: MateLineRef }
  | { ok: false; reason: 'invalidEdge' | 'degenerateLine' }

/** Pojedyncza krawędź siatki na detalu programu. */
export function captureMateLine(
  partId: string,
  geometry: BufferGeometry,
  vertexA: number,
  vertexB: number,
): CaptureMateLineResult {
  const position = geometry.getAttribute('position')
  if (
    !position ||
    !Number.isInteger(vertexA) ||
    !Number.isInteger(vertexB) ||
    vertexA < 0 ||
    vertexB < 0 ||
    vertexA >= position.count ||
    vertexB >= position.count ||
    vertexA === vertexB
  ) {
    return { ok: false, reason: 'invalidEdge' }
  }

  const ax = position.getX(vertexA)
  const ay = position.getY(vertexA)
  const az = position.getZ(vertexA)
  const bx = position.getX(vertexB)
  const by = position.getY(vertexB)
  const bz = position.getZ(vertexB)
  const lenSq = (bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2
  if (lenSq < 1e-18) {
    return { ok: false, reason: 'degenerateLine' }
  }

  const [va, vb] = normalizeMateLineVertices(vertexA, vertexB)
  return {
    ok: true,
    line: {
      kind: 'line',
      partId,
      vertexA: va,
      vertexB: vb,
    },
  }
}
