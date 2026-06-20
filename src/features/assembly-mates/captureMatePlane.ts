import type { BufferGeometry } from 'three'
import { getCoplanarConnectedFaces } from '../model-selection/facePlaneSelection'
import type { MatePlaneRef } from './model'

export type CaptureMatePlaneResult =
  | { ok: true; plane: MatePlaneRef }
  | { ok: false; reason: 'invalidFace' | 'emptyPatch' }

/** Z pojedynczego trójkąta — cała łata koplanarna na detalu. */
export function captureMatePlane(
  partId: string,
  geometry: BufferGeometry,
  seedFaceIndex: number,
): CaptureMatePlaneResult {
  if (!Number.isInteger(seedFaceIndex) || seedFaceIndex < 0) {
    return { ok: false, reason: 'invalidFace' }
  }
  const patch = getCoplanarConnectedFaces(geometry, seedFaceIndex)
  if (patch.length === 0) {
    return { ok: false, reason: 'emptyPatch' }
  }
  const faceIndices = [...patch].sort((a, b) => a - b)
  return {
    ok: true,
    plane: {
      partId,
      faceIndex: faceIndices[0]!,
      faceIndices,
    },
  }
}
