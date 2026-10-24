import { describe, expect, it } from 'vitest'
import {
  alignSizeSliderBounds,
  cleanSizeMmFloat,
  formatSizeMmInput,
  sizeMmForUi,
  snapSizeMmToStep,
} from './snapSizeMmToStep'

describe('snapSizeMmToStep', () => {
  it('zaokrągla do kroku 1', () => {
    expect(snapSizeMmToStep(10.4, 1)).toBe(10)
    expect(snapSizeMmToStep(10.5, 1)).toBe(11)
    expect(snapSizeMmToStep(10, 1)).toBe(10)
  })

  it('zaokrągla do kroku 0.5', () => {
    expect(snapSizeMmToStep(10.24, 0.5)).toBe(10)
    expect(snapSizeMmToStep(10.25, 0.5)).toBe(10.5)
  })
})

describe('cleanSizeMmFloat / sizeMmForUi', () => {
  it('usuwa szum float po stretch', () => {
    expect(cleanSizeMmFloat(100.0000000002)).toBe(100)
    expect(formatSizeMmInput(100.0000000002)).toBe('100')
  })

  it('sizeMmForUi trzyma siatkę kroku', () => {
    expect(sizeMmForUi(100.0000002, () => 1)).toBe(100)
    expect(sizeMmForUi(10.24, () => 0.5)).toBe(10)
    expect(sizeMmForUi(10.25, () => 0.5)).toBe(10.5)
  })
})

describe('alignSizeSliderBounds', () => {
  it('wyrównuje zakres do siatki kroku', () => {
    expect(alignSizeSliderBounds(25.125, 200.7, 1)).toEqual({ min: 25, max: 201 })
  })

  it('gwarantuje max > min', () => {
    expect(alignSizeSliderBounds(10, 10, 1)).toEqual({ min: 10, max: 11 })
  })
})
