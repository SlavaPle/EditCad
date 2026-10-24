import { describe, expect, it } from 'vitest'
import {
  clampSizeEditValue,
  isSizeValueFieldDisabled,
  isSizeValueFieldMuted,
} from './clampSizeEditValue'

describe('clampSizeEditValue', () => {
  it('rejects non-positive / non-finite', () => {
    expect(clampSizeEditValue({ value: 0, limitType: 'free' })).toBeNull()
    expect(clampSizeEditValue({ value: -1, limitType: 'free' })).toBeNull()
    expect(clampSizeEditValue({ value: NaN, limitType: 'free' })).toBeNull()
  })

  it('passes free values through', () => {
    expect(clampSizeEditValue({ value: 12.5, limitType: 'free' })).toBe(12.5)
  })

  it('clamps to min', () => {
    expect(clampSizeEditValue({ value: 5, limitType: 'min', minMm: 10 })).toBe(10)
    expect(clampSizeEditValue({ value: 15, limitType: 'min', minMm: 10 })).toBe(15)
  })

  it('clamps to max', () => {
    expect(clampSizeEditValue({ value: 50, limitType: 'max', maxMm: 40 })).toBe(40)
    expect(clampSizeEditValue({ value: 20, limitType: 'max', maxMm: 40 })).toBe(20)
  })

  it('clamps to minmax band', () => {
    expect(
      clampSizeEditValue({ value: 5, limitType: 'minmax', minMm: 10, maxMm: 30 }),
    ).toBe(10)
    expect(
      clampSizeEditValue({ value: 40, limitType: 'minmax', minMm: 10, maxMm: 30 }),
    ).toBe(30)
    expect(
      clampSizeEditValue({ value: 20, limitType: 'minmax', minMm: 10, maxMm: 30 }),
    ).toBe(20)
  })

  it('keeps const value as-is when finite', () => {
    expect(clampSizeEditValue({ value: 25, limitType: 'const' })).toBe(25)
  })
})

describe('size value field flags', () => {
  it('mutes when limited', () => {
    expect(isSizeValueFieldMuted('free')).toBe(false)
    expect(isSizeValueFieldMuted('minmax')).toBe(true)
    expect(isSizeValueFieldDisabled('const')).toBe(true)
    expect(isSizeValueFieldDisabled('minmax')).toBe(false)
  })
})
