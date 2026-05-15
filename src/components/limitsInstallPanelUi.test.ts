import { describe, expect, it } from 'vitest'
import { getLimitsInstallActivePairPanelUi } from './limitsInstallPanelUi'

describe('getLimitsInstallActivePairPanelUi', () => {
  it('hides stretch distance UI when limits install is active with a face pair', () => {
    const ui = getLimitsInstallActivePairPanelUi({
      hasModel: true,
      limitsInstallActive: true,
      faceStretchSelection: true,
    })
    expect(ui.showSection).toBe(true)
    expect(ui.showLimitTypeForm).toBe(true)
    expect(ui.showHeader).toBe(false)
    expect(ui.showHint).toBe(false)
    expect(ui.showActivePairDistance).toBe(false)
    expect(ui.showManualStretchTarget).toBe(false)
  })

  it('does not show the section without model, limits mode, or face pair', () => {
    expect(
      getLimitsInstallActivePairPanelUi({
        hasModel: false,
        limitsInstallActive: true,
        faceStretchSelection: true,
      }).showSection,
    ).toBe(false)
    expect(
      getLimitsInstallActivePairPanelUi({
        hasModel: true,
        limitsInstallActive: false,
        faceStretchSelection: true,
      }).showSection,
    ).toBe(false)
    expect(
      getLimitsInstallActivePairPanelUi({
        hasModel: true,
        limitsInstallActive: true,
        faceStretchSelection: false,
      }).showSection,
    ).toBe(false)
  })
})
