import type { FaceConstraint, PanelFaceConstraint } from './model'
import { replaceFaceConstraintById } from './store'

/** Aktualizuje powiązane CONST (grubość) i MINMAX (X/Y) po edycji rekordu PANEL. */
export function syncPanelAuxiliaryConstraints(
  list: readonly FaceConstraint[],
  panel: PanelFaceConstraint,
): FaceConstraint[] {
  let next = replaceFaceConstraintById(list, panel)

  if (panel.thicknessConstId) {
    const linked = next.find((c) => c.id === panel.thicknessConstId)
    if (linked?.type === 'const') {
      next = replaceFaceConstraintById(next, { ...linked, valueMm: panel.thicknessMm })
    }
  }

  if (panel.panelXMinMaxId) {
    const linked = next.find((c) => c.id === panel.panelXMinMaxId)
    if (linked?.type === 'minmax') {
      next = replaceFaceConstraintById(next, {
        ...linked,
        minMm: panel.panelX.minMm ?? 0,
        maxMm: panel.panelX.maxMm,
      })
    }
  }

  if (panel.panelYMinMaxId) {
    const linked = next.find((c) => c.id === panel.panelYMinMaxId)
    if (linked?.type === 'minmax') {
      next = replaceFaceConstraintById(next, {
        ...linked,
        minMm: panel.panelY.minMm ?? 0,
        maxMm: panel.panelY.maxMm,
      })
    }
  }

  return next
}
