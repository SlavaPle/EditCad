import type { BufferGeometry } from 'three'
import { partitionSelectionIntoCoplanarPatches } from '../model-selection/facePlaneSelection'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { mergedFacesMatchProfilElementPair } from './matchesProfilEditTarget'

function sortedKey(arr: readonly number[]): string {
  return [...arr].sort((x, y) => x - y).join(',')
}

/** MIN/MAX/CONST na tej samej parze coplanów co rozciąganie? */
export function mergedFacesMatchConstraintStretchPair(
  geometry: BufferGeometry,
  mergedFacesForEdit: readonly number[],
  elements: readonly PreparedModelElement[],
  c: FaceConstraint,
): boolean {
  if (c.type !== 'min' && c.type !== 'max' && c.type !== 'minmax' && c.type !== 'const') return false

  const ea = c.elementAId?.trim()
  const eb = c.elementBId?.trim()
  if (ea && eb && elements.length > 0) {
    return mergedFacesMatchProfilElementPair(geometry, mergedFacesForEdit, elements, ea, eb)
  }

  if (c.facePair) {
    const patchesStretch = partitionSelectionIntoCoplanarPatches(geometry, mergedFacesForEdit)
    if (patchesStretch.length !== 2) return false
    const patchesConstraint = partitionSelectionIntoCoplanarPatches(geometry, [c.facePair.a, c.facePair.b])
    if (patchesConstraint.length !== 2) return false
    const k0 = sortedKey(patchesStretch[0]!)
    const k1 = sortedKey(patchesStretch[1]!)
    const ca = sortedKey(patchesConstraint[0]!)
    const cb = sortedKey(patchesConstraint[1]!)
    return (k0 === ca && k1 === cb) || (k0 === cb && k1 === ca)
  }

  return false
}
