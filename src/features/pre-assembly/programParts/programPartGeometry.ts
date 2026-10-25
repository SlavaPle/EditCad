import type { BufferGeometry } from 'three'
import { loadModel } from '../../../lib/loadModel'
import type { PreparedElementConstraints } from '../../../lib/preparedElementFormat'
import {
  DEFAULT_MODEL_APPEARANCE,
  type ModelAppearance,
} from '../../viewer-display/modelAppearance'
import { emptyProgramPartPreparedConstraints } from './resolveViewportPreparedBinding'

export type ProgramPartGeometryLoadResult =
  | {
      ok: true
      geometry: BufferGeometry
      appearance: ModelAppearance
      constraints: PreparedElementConstraints
    }
  | { ok: false; error: string }

/**
 * Ładuje geometrię mesh (oraz wygląd / constraints z .ecdprt).
 * Akceptuje te same formaty co Open modelu (.stl, .ecdprt, …).
 */
export async function loadProgramPartGeometryFromFile(
  file: File,
): Promise<ProgramPartGeometryLoadResult> {
  const result = await loadModel(file)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  return {
    ok: true,
    geometry: result.geometry,
    appearance: result.prepared?.appearance ?? DEFAULT_MODEL_APPEARANCE,
    constraints: result.prepared?.constraints ?? emptyProgramPartPreparedConstraints(),
  }
}
