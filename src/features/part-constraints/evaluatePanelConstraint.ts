import type { PanelFaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'

const EDGE_TOL_MM = 1.5
const EPS = 1e-3

function boxExtentsMm(geo: StretchConstraintEvalContext['geometryAfter']): [number, number, number] | null {
  const bb = geo.boundingBox
  if (!bb) return null
  const sx = bb.max.x - bb.min.x
  const sy = bb.max.y - bb.min.y
  const sz = bb.max.z - bb.min.z
  if (!(sx >= 0) || !(sy >= 0) || !(sz >= 0)) return null
  return [sx, sy, sz]
}

/**
 * PANEL — uproszczony test oparty na AABB: grubość = najkrótsza krawędź pudła;
 * dwie dłuższe krawędzie porównujemy z panelX / panelY (minMm tylko jeśli jest w danych).
 */
export function evaluatePanelConstraint(
  ctx: StretchConstraintEvalContext,
  c: PanelFaceConstraint,
): PreparedStretchPrecheckError | null {
  const extents = boxExtentsMm(ctx.geometryAfter)
  if (!extents) return null

  const [d0, d1, d2] = extents
  const sorted = [d0, d1, d2].sort((x, y) => x - y)
  const thick = sorted[0]!
  const mid = sorted[1]!
  const long = sorted[2]!

  function axisOk(extent: number, bounds: PanelFaceConstraint['panelX']) {
    if (!(extent > EPS)) return false
    if (bounds.minMm !== undefined && extent + EPS < bounds.minMm) return false
    if (extent > bounds.maxMm + EDGE_TOL_MM) return false
    return true
  }

  if (Math.abs(thick - c.thicknessMm) > EDGE_TOL_MM) return 'constraintPanelBroken'
  if (!axisOk(mid, c.panelX)) return 'constraintPanelBroken'
  if (!axisOk(long, c.panelY)) return 'constraintPanelBroken'
  return null
}
