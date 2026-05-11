import { describe, expect, it } from 'vitest'
import { parseNonNegativeMmWithDefaultZero, parsePositiveMm } from './parsePositiveMm'

describe('parsePositiveMm', () => {
  it('parses integers and trims', () => {
    expect(parsePositiveMm(' 42 ')).toBe(42)
    expect(parsePositiveMm('1')).toBe(1)
  })

  it('accepts comma decimal separator', () => {
    expect(parsePositiveMm('12,5')).toBeCloseTo(12.5)
  })

  it('accepts dot decimal separator', () => {
    expect(parsePositiveMm('0.25')).toBeCloseTo(0.25)
  })

  it('returns null for empty, zero, negative, NaN', () => {
    expect(parsePositiveMm('')).toBeNull()
    expect(parsePositiveMm('  ')).toBeNull()
    expect(parsePositiveMm('0')).toBeNull()
    expect(parsePositiveMm('-3')).toBeNull()
    expect(parsePositiveMm('abc')).toBeNull()
  })
})

describe('parseNonNegativeMmWithDefaultZero', () => {
  it('treats empty as zero', () => {
    expect(parseNonNegativeMmWithDefaultZero('')).toBe(0)
    expect(parseNonNegativeMmWithDefaultZero('  ')).toBe(0)
  })

  it('accepts zero and positives', () => {
    expect(parseNonNegativeMmWithDefaultZero('0')).toBe(0)
    expect(parseNonNegativeMmWithDefaultZero('12,25')).toBeCloseTo(12.25)
  })

  it('rejects negatives and NaN', () => {
    expect(parseNonNegativeMmWithDefaultZero('-1')).toBeNull()
    expect(parseNonNegativeMmWithDefaultZero('x')).toBeNull()
  })
})
