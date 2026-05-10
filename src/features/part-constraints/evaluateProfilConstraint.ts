import {
  validateProfilFrozenSlotStored,
  type ConstFaceConstraint,
  type MaxFaceConstraint,
  type MinFaceConstraint,
  type ProfilFaceConstraint,
  type ProfilFrozenSlotStored,
} from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import { mergedFacesMatchProfilStretchAxis } from './matchesProfilStretchAxis'
import { evaluateConstGeometryInvariant } from './evaluateConstConstraint'
import { evaluateMaxConstraint } from './evaluateMaxConstraint'
import { evaluateMinConstraint } from './evaluateMinConstraint'

function frozenSlotAsConst(slot: ProfilFrozenSlotStored): ConstFaceConstraint {
  return {
    id: '_profil_frozen',
    type: 'const',
    facePair: null,
    elementAId: slot.elementAId?.trim() || undefined,
    elementBId: slot.elementBId?.trim() || undefined,
    edgeVertexPair: slot.edgeVertexPair,
    valueMm: 1,
  }
}

/**
 * PROFIL — dwa CONST (frozen1/frozen2) + na parze rozciągania: opcjonalny MIN i MAX (`valueMm`).
 */
export function evaluateProfilConstraint(
  ctx: StretchConstraintEvalContext,
  c: ProfilFaceConstraint,
): PreparedStretchPrecheckError | null {
  const slots = [c.frozen1, c.frozen2]
  for (const slot of slots) {
    if (!slot || !validateProfilFrozenSlotStored(slot)) continue
    const err = evaluateConstGeometryInvariant(ctx, frozenSlotAsConst(slot))
    if (err) return err
  }

  if (
    !mergedFacesMatchProfilStretchAxis(
      ctx.geometryBefore,
      ctx.mergedFacesForEdit,
      ctx.elements,
      c,
    )
  )
    return 'profilWrongTarget'

  const stretchMinMm = c.stretchMinMm
  if (typeof stretchMinMm === 'number' && Number.isFinite(stretchMinMm) && stretchMinMm > 0) {
    const minLane: MinFaceConstraint = {
      id: `${c.id}_profil_min`,
      type: 'min',
      facePair: c.facePair,
      elementAId: c.elementAId,
      elementBId: c.elementBId,
      valueMm: stretchMinMm,
    }
    const errMin = evaluateMinConstraint(ctx, minLane)
    if (errMin === 'constraintBrokenMin') return 'constraintBrokenProfilMin'
    if (errMin) return errMin
  }

  const maxLane: MaxFaceConstraint = {
    id: `${c.id}_profil_max`,
    type: 'max',
    facePair: c.facePair,
    elementAId: c.elementAId,
    elementBId: c.elementBId,
    valueMm: c.valueMm,
  }
  const errMax = evaluateMaxConstraint(ctx, maxLane)
  if (errMax === 'constraintBrokenMax') return 'constraintBrokenProfil'
  return errMax
}
