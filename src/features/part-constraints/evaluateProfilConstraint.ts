import { partitionSelectionIntoCoplanarPatches } from '../model-selection/facePlaneSelection'
import type { ProfilFaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import { measureConstraintPairGapMm } from './measurePairGapMm'
import { mergedFacesMatchProfilElementPair } from './matchesProfilEditTarget'

const EPS = 1e-3

function editMatchesLegacyProfilFaces(
  ctx: StretchConstraintEvalContext,
  faceA: number,
  faceB: number,
): boolean {
  const patches = partitionSelectionIntoCoplanarPatches(ctx.geometryBefore, ctx.mergedFacesForEdit)
  if (patches.length !== 2) return false
  const sa = new Set(patches[0])
  const sb = new Set(patches[1])
  return (
    (sa.has(faceA) && sb.has(faceB)) ||
    (sa.has(faceB) && sb.has(faceA))
  )
}

/**
 * PROFIL — tylko wskazana para elementów może zmieniać rozmiar; max = górne dopuszczalne rozciągnięcie (mniej — dozwolone).
 * Próba rozciągania innej pary lub przekroczenie max są zabronione.
 */
export function evaluateProfilConstraint(
  ctx: StretchConstraintEvalContext,
  c: ProfilFaceConstraint,
): PreparedStretchPrecheckError | null {
  const ea = c.elementAId?.trim()
  const eb = c.elementBId?.trim()

  let editMatchesProfilPair = false
  if (ea && eb) {
    editMatchesProfilPair = mergedFacesMatchProfilElementPair(
      ctx.geometryBefore,
      ctx.mergedFacesForEdit,
      [...ctx.elements],
      ea,
      eb,
    )
  } else if (c.facePair) {
    editMatchesProfilPair = editMatchesLegacyProfilFaces(ctx, c.facePair.a, c.facePair.b)
  } else {
    return null
  }

  if (!editMatchesProfilPair) return 'profilWrongTarget'

  const gapAfter = measureConstraintPairGapMm(ctx.geometryAfter, c, ctx.elements)
  if (gapAfter === null) return null
  return gapAfter <= c.valueMm + EPS ? null : 'constraintBrokenProfil'
}
