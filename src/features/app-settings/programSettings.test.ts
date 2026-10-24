import { afterEach, describe, expect, it } from 'vitest'
import {
  getProgramSettings,
  getSizeStepMm,
  resetProgramSettings,
  resolveSizeStepMm,
  setSizeStepMm,
} from './programSettings'

afterEach(() => {
  resetProgramSettings()
})

describe('programSettings', () => {
  it('domyślnie bazowy krok 1 oraz progi 5 / 1', () => {
    expect(getSizeStepMm()).toBe(1)
    expect(getProgramSettings().sizeStepFineThresholdMm).toBe(5)
    expect(getProgramSettings().sizeStepFineMm).toBe(0.5)
    expect(getProgramSettings().sizeStepExtraFineThresholdMm).toBe(1)
    expect(getProgramSettings().sizeStepExtraFineMm).toBe(0.05)
  })

  it('setSizeStepMm aktualizuje singleton', () => {
    setSizeStepMm(2)
    expect(getSizeStepMm()).toBe(2)
  })

  it('odrzuca nieprawidłowy krok', () => {
    setSizeStepMm(2)
    setSizeStepMm(0)
    setSizeStepMm(-1)
    setSizeStepMm(Number.NaN)
    expect(getSizeStepMm()).toBe(2)
  })
})

describe('resolveSizeStepMm', () => {
  it('≥ 5 → 1; &lt; 5 → 0.5; &lt; 1 → 0.05', () => {
    expect(resolveSizeStepMm(10)).toBe(1)
    expect(resolveSizeStepMm(5)).toBe(1)
    expect(resolveSizeStepMm(4.9)).toBe(0.5)
    expect(resolveSizeStepMm(1)).toBe(0.5)
    expect(resolveSizeStepMm(0.9)).toBe(0.05)
    expect(resolveSizeStepMm(0.05)).toBe(0.05)
  })
})
