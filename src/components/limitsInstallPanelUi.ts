/** Widoczność sekcji panelu Limits przy wybranej parze rozciągania. */
export type LimitsInstallActivePairPanelUi = {
  showSection: boolean
  showHeader: boolean
  showHint: boolean
  showActivePairDistance: boolean
  showManualStretchTarget: boolean
  showLimitTypeForm: boolean
}

export function getLimitsInstallActivePairPanelUi(input: {
  hasModel: boolean
  limitsInstallActive: boolean
  faceStretchSelection: boolean
}): LimitsInstallActivePairPanelUi {
  const showSection =
    input.hasModel && input.limitsInstallActive && input.faceStretchSelection
  return {
    showSection,
    showHeader: false,
    showHint: false,
    showActivePairDistance: false,
    showManualStretchTarget: false,
    showLimitTypeForm: showSection,
  }
}
