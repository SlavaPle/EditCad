import type { BufferGeometry } from 'three'
import { captureMatePlane } from './captureMatePlane'
import {
  createMateDraftSession,
  mateDraftSetEntity,
  type MateDraftSession,
} from './mateDraft'
import { initialMatesPickSlot } from './matesPickFlow'
import type { MatesPickSlot } from './matesPickMode'
import {
  mateFacePairIsComplete,
  type MateFacePair,
  type MateFacePick,
} from './mateFacePairSelection'

export type OpenMateFromFacePairInput = {
  pair: MateFacePair
  geometries: Readonly<Record<string, BufferGeometry>>
}

export type OpenMateFromFacePairResult = {
  session: MateDraftSession
  /** null = od razu parametry (para kompletna); inaczej type-first pick. */
  pickSlot: MatesPickSlot | null
  openedFromPair: boolean
}

function planeFromPick(
  pick: MateFacePick,
  geometry: BufferGeometry | undefined,
): ReturnType<typeof captureMatePlane> {
  if (!geometry) {
    return { ok: false, reason: 'invalidFace' }
  }
  return captureMatePlane(pick.partId, geometry, pick.seedFaceIndex)
}

/**
 * Kompletna para ścian → draft z entityA/B i bez aktywnego slotu pick.
 * Niekompletna → pusty draft + slot entityA (type-first).
 */
export function openMateFromFacePair(input: OpenMateFromFacePairInput): OpenMateFromFacePairResult {
  const { pair, geometries } = input

  if (!mateFacePairIsComplete(pair) || !pair.first || !pair.second) {
    const session = createMateDraftSession()
    return {
      session,
      pickSlot: initialMatesPickSlot(session),
      openedFromPair: false,
    }
  }

  const planeA = planeFromPick(pair.first, geometries[pair.first.partId])
  const planeB = planeFromPick(pair.second, geometries[pair.second.partId])
  if (!planeA.ok || !planeB.ok) {
    const session = createMateDraftSession()
    return {
      session,
      pickSlot: initialMatesPickSlot(session),
      openedFromPair: false,
    }
  }

  let session = createMateDraftSession()
  session = mateDraftSetEntity(session, 'entityA', planeA.plane)
  session = mateDraftSetEntity(session, 'entityB', planeB.plane)
  return {
    session,
    pickSlot: null,
    openedFromPair: true,
  }
}
