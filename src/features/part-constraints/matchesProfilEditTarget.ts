import type { BufferGeometry } from 'three'
import { partitionSelectionIntoCoplanarPatches } from '../model-selection/facePlaneSelection'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'

function sortedKey(arr: readonly number[]): string {
  return [...arr].sort((x, y) => x - y).join(',')
}

/**
 * Sprawdza, czy aktualnie edytowana para łat (mergedFacesForEdit) pokrywa się z elementami PROFIL (A↔B).
 */
export function mergedFacesMatchProfilElementPair(
  geometry: BufferGeometry,
  mergedFacesForEdit: readonly number[],
  elements: readonly PreparedModelElement[],
  elementAId: string,
  elementBId: string,
): boolean {
  const ea = elements.find((e) => e.id === elementAId)
  const eb = elements.find((e) => e.id === elementBId)
  if (!ea || !eb) return false

  const patches = partitionSelectionIntoCoplanarPatches(geometry, mergedFacesForEdit)
  if (patches.length !== 2) return false

  const k0 = sortedKey(patches[0]!)
  const k1 = sortedKey(patches[1]!)
  const ka = sortedKey(ea.faceIndices)
  const kb = sortedKey(eb.faceIndices)

  return (k0 === ka && k1 === kb) || (k0 === kb && k1 === ka)
}
