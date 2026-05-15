import { describe, expect, it } from 'vitest'
import { getLimitsInstallActivePairPanelUi } from './limitsInstallPanelUi'

const baseInput = {
  hasModel: true,
  limitsInstallActive: true,
  faceStretchSelection: false,
  limitsInstallConstraintType: 'minmax' as const,
}

describe('getLimitsInstallActivePairPanelUi', () => {
  it('hides stretch distance UI when limits install is active with a face pair', () => {
    const ui = getLimitsInstallActivePairPanelUi({
      ...baseInput,
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
        ...baseInput,
        hasModel: false,
        faceStretchSelection: true,
      }).showSection,
    ).toBe(false)
    expect(
      getLimitsInstallActivePairPanelUi({
        ...baseInput,
        limitsInstallActive: false,
        faceStretchSelection: true,
      }).showSection,
    ).toBe(false)
    expect(
      getLimitsInstallActivePairPanelUi({
        ...baseInput,
        faceStretchSelection: false,
      }).showSection,
    ).toBe(false)
  })

  it('shows section for BLOCK without face pair selection', () => {
    const ui = getLimitsInstallActivePairPanelUi({
      ...baseInput,
      limitsInstallConstraintType: 'block',
    })
    expect(ui.showSection).toBe(true)
    expect(ui.isBlockInstall).toBe(true)
    expect(ui.showLimitTypeForm).toBe(true)
  })

  it('does not show BLOCK section without model', () => {
    const ui = getLimitsInstallActivePairPanelUi({
      ...baseInput,
      hasModel: false,
      limitsInstallConstraintType: 'block',
    })
    expect(ui.showSection).toBe(false)
    expect(ui.isBlockInstall).toBe(true)
  })

  it('does not treat minmax as block install without face pair', () => {
    const ui = getLimitsInstallActivePairPanelUi({
      ...baseInput,
      limitsInstallConstraintType: 'minmax',
      faceStretchSelection: false,
    })
    expect(ui.showSection).toBe(false)
    expect(ui.isBlockInstall).toBe(false)
  })

  it('isBlockInstall is false when limits install is off', () => {
    const ui = getLimitsInstallActivePairPanelUi({
      ...baseInput,
      limitsInstallActive: false,
      limitsInstallConstraintType: 'block',
    })
    expect(ui.showSection).toBe(false)
    expect(ui.isBlockInstall).toBe(false)
  })
})
