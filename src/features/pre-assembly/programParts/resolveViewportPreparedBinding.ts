import type { BufferGeometry } from 'three'
import type { FaceConstraint } from '../../face-constraints/model'
import type {
  PreparedElementConstraints,
  PreparedModelElement,
} from '../../../lib/preparedElementFormat'

const EMPTY_PREPARED: PreparedElementConstraints = {
  mode: 'fixed',
  faceConstraints: [],
  modelElements: [],
}

export type ViewportPreparedBinding = {
  /** Geometria używana przez RightPanel (detal programu lub model główny). */
  model: BufferGeometry | null
  /** Id aktywnego detalu programu, gdy binding dotyczy geometrii części. */
  activeProgramPartId: string | null
  prepared: PreparedElementConstraints
  modelElements: readonly PreparedModelElement[]
  faceConstraints: FaceConstraint[]
}

/**
 * Dobiera constraints/elements do geometrii viewportu.
 * Przy aktywnej części w pre-assembly nie wolno mieszać geometrii części
 * z modelElements / faceConstraints modelu głównego.
 */
export function resolveViewportPreparedBinding(params: {
  preAssemblyActive: boolean
  activeProgramPartId: string | null
  programPartGeometries: Readonly<Record<string, BufferGeometry>>
  programPartConstraints: Readonly<Record<string, PreparedElementConstraints>>
  mainModel: BufferGeometry | null
  mainPrepared: PreparedElementConstraints
}): ViewportPreparedBinding {
  const {
    preAssemblyActive,
    activeProgramPartId,
    programPartGeometries,
    programPartConstraints,
    mainModel,
    mainPrepared,
  } = params

  if (preAssemblyActive && activeProgramPartId) {
    const partGeometry = programPartGeometries[activeProgramPartId]
    if (partGeometry) {
      const prepared = programPartConstraints[activeProgramPartId] ?? EMPTY_PREPARED
      return {
        model: partGeometry,
        activeProgramPartId,
        prepared,
        modelElements: prepared.modelElements ?? [],
        faceConstraints: [...(prepared.faceConstraints ?? [])],
      }
    }
  }

  return {
    model: mainModel,
    activeProgramPartId: null,
    prepared: mainPrepared,
    modelElements: mainPrepared.modelElements ?? [],
    faceConstraints: [...(mainPrepared.faceConstraints ?? [])],
  }
}

export function emptyProgramPartPreparedConstraints(): PreparedElementConstraints {
  return {
    mode: 'fixed',
    faceConstraints: [],
    modelElements: [],
  }
}
