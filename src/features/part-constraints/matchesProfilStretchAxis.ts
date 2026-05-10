import type { BufferGeometry } from 'three'
import { partitionSelectionIntoCoplanarPatches } from '../model-selection/facePlaneSelection'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import type { ProfilFaceConstraint } from '../face-constraints/model'
import { mergedFacesMatchProfilElementPair } from './matchesProfilEditTarget'

function editMatchesLegacyProfilFaces(
  geometry: BufferGeometry,
  mergedFacesForEdit: readonly number[],
  faceA: number,
  faceB: number,
): boolean {
  const patches = partitionSelectionIntoCoplanarPatches(geometry, mergedFacesForEdit)
  if (patches.length !== 2) return false
  const sa = new Set(patches[0]!)
  const sb = new Set(patches[1]!)
  return (sa.has(faceA) && sb.has(faceB)) || (sa.has(faceB) && sb.has(faceA))
}

/** Para rozciągania PROFIL (element↔element albo stary facePair). */
export function mergedFacesMatchProfilStretchAxis(
  geometry: BufferGeometry,
  mergedFacesForEdit: readonly number[],
  elements: readonly PreparedModelElement[],
  c: ProfilFaceConstraint,
): boolean {
  const ea = c.elementAId?.trim()
  const eb = c.elementBId?.trim()
  if (ea && eb) {
    return mergedFacesMatchProfilElementPair(geometry, mergedFacesForEdit, elements, ea, eb)
  }
  if (c.facePair) return editMatchesLegacyProfilFaces(geometry, mergedFacesForEdit, c.facePair.a, c.facePair.b)
  return false
}
