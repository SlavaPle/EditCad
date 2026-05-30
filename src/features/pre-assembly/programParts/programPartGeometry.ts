import type { BufferGeometry } from 'three'
import { loadModel } from '../../../lib/loadModel'

/** Ładuje geometrię mesh z pliku programu .ecdprt. */
export async function loadProgramPartGeometryFromFile(
  file: File,
): Promise<{ ok: true; geometry: BufferGeometry } | { ok: false; error: string }> {
  const result = await loadModel(file)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  if (result.format !== 'ecdprt') {
    return { ok: false, error: 'Expected an ECDPRT program part file.' }
  }
  return { ok: true, geometry: result.geometry }
}
