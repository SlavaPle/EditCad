import type { FaceConstraintType } from '../features/face-constraints/model'

/** Widoczność sekcji panelu Limits przy wybranej parze rozciągania. */
export type LimitsInstallActivePairPanelUi = {
  showSection: boolean
  showHeader: boolean
  showHint: boolean
  showActivePairDistance: boolean
  showManualStretchTarget: boolean
  showLimitTypeForm: boolean
  /** BLOCK — bez wyboru par; tylko typ + podpowiedź + dodaj. */
  isBlockInstall: boolean
}

export function getLimitsInstallActivePairPanelUi(input: {
  hasModel: boolean
  limitsInstallActive: boolean
  faceStretchSelection: boolean
  limitsInstallConstraintType: FaceConstraintType
}): LimitsInstallActivePairPanelUi {
  const isBlockInstall =
    input.limitsInstallActive && input.limitsInstallConstraintType === 'block'
  const showSection =
    input.hasModel &&
    input.limitsInstallActive &&
    (isBlockInstall || input.faceStretchSelection)
  return {
    showSection,
    showHeader: false,
    showHint: false,
    showActivePairDistance: false,
    showManualStretchTarget: false,
    showLimitTypeForm: showSection,
    isBlockInstall,
  }
}
