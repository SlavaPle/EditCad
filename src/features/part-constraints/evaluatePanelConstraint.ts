import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import { boundingBoxThicknessAndInPlaneSpansMm } from '../face-constraints/panelExtentsFromBBox'
import type { PanelFaceConstraint } from '../face-constraints/model'
import { measurePreparedElementPairGapMm } from './measurePairGapMm'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'

export const PANEL_EDGE_TOL_MM = 1.5
const EPS = 1e-3

function axisOk(extent: number, bounds: PanelFaceConstraint['panelX']) {
  if (!(extent > EPS)) return false
  if (bounds.minMm !== undefined && extent + EPS < bounds.minMm) return false
  if (extent > bounds.maxMm + PANEL_EDGE_TOL_MM) return false
  return true
}

function thicknessGapMm(
  geo: StretchConstraintEvalContext['geometryAfter'],
  merged: readonly number[],
): number | null {
  const an = analyzeTwoFaceStretch(geo, [...merged])
  return an.ok ? an.gapMm : null
}

function evaluatePanelBBoxLegacy(ctx: StretchConstraintEvalContext, c: PanelFaceConstraint): PreparedStretchPrecheckError | null {
  const triple = boundingBoxThicknessAndInPlaneSpansMm(ctx.geometryAfter)
  if (!triple) return null
  if (!axisOk(triple.inPlaneMinorMm, c.panelX)) return 'constraintPanelBroken'
  if (!axisOk(triple.inPlaneMajorMm, c.panelY)) return 'constraintPanelBroken'
  return null
}

/**
 * PANEL — grubość wg odległości między głównymi płaszczyznami rozciągania (mergedFaces).
 * Osie X/Y: albo konkretne pary elementów (`facePairs`), albo dziedziczna heurystyka pudła (`bboxExtents`).
 */
export function evaluatePanelConstraint(
  ctx: StretchConstraintEvalContext,
  c: PanelFaceConstraint,
): PreparedStretchPrecheckError | null {
  const thicknessTriangles = ctx.panelThicknessMergedFaces ?? ctx.mergedFacesForEdit

  const tg = thicknessGapMm(ctx.geometryAfter, thicknessTriangles)
  if (tg === null) return 'constraintPanelBroken'
  if (Math.abs(tg - c.thicknessMm) > PANEL_EDGE_TOL_MM) return 'constraintPanelBroken'

  if (c.panelMeasureMode === 'bboxExtents') {
    const err = evaluatePanelBBoxLegacy(ctx, c)
    return err ?? null
  }

  const gx = measurePreparedElementPairGapMm(
    ctx.geometryAfter,
    c.panelXElementAId ?? '',
    c.panelXElementBId ?? '',
    ctx.elements,
  )
  const gy = measurePreparedElementPairGapMm(
    ctx.geometryAfter,
    c.panelYElementAId ?? '',
    c.panelYElementBId ?? '',
    ctx.elements,
  )
  if (gx === null || gy === null) return 'constraintPanelBroken'
  if (!axisOk(gx, c.panelX)) return 'constraintPanelBroken'
  if (!axisOk(gy, c.panelY)) return 'constraintPanelBroken'
  return null
}
