import type { BufferGeometry } from 'three'
import { trySelectCurvedPlaneFromFace } from '../model-selection/curvedPlaneSelection'
import type { MateCurvedPlaneRef } from './model'

export type CaptureMateCurvedPlaneResult =
  | { ok: true; curvedPlane: MateCurvedPlaneRef }
  | { ok: false; reason: 'invalidFace' | 'notCurvedPlane' }

/**
 * Z trójkąta na ścianie bocznej — pas walca (2 łuki) lub stożka (łuk + apex).
 */
export function captureMateCurvedPlane(
  partId: string,
  geometry: BufferGeometry,
  seedFaceIndex: number,
): CaptureMateCurvedPlaneResult {
  if (!Number.isInteger(seedFaceIndex) || seedFaceIndex < 0) {
    return { ok: false, reason: 'invalidFace' }
  }
  const selected = trySelectCurvedPlaneFromFace(geometry, seedFaceIndex)
  if (!selected) {
    return { ok: false, reason: 'notCurvedPlane' }
  }
  // Odrzuć redirect z płaskiej pokrywy na walec — seed musi leżeć w paśmie
  if (!selected.faceIndices.includes(seedFaceIndex)) {
    return { ok: false, reason: 'notCurvedPlane' }
  }
  if (!selected.arcB && selected.apexVertexIndex === undefined) {
    return { ok: false, reason: 'notCurvedPlane' }
  }

  const curvedPlane: MateCurvedPlaneRef = {
    kind: 'curvedPlane',
    partId,
    faceIndex: selected.faceIndex,
    faceIndices: selected.faceIndices,
    arcA: {
      vertexIndices: selected.arcA.vertexIndices,
      closed: selected.arcA.closed,
    },
  }
  if (selected.arcB) {
    curvedPlane.arcB = {
      vertexIndices: selected.arcB.vertexIndices,
      closed: selected.arcB.closed,
    }
  }
  if (selected.apexVertexIndex !== undefined) {
    curvedPlane.apexVertexIndex = selected.apexVertexIndex
  }
  return { ok: true, curvedPlane }
}
