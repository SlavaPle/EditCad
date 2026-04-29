import { describe, expect, it } from 'vitest'
import { parseFaceConstraint, parseFaceConstraintList, validateFaceConstraint } from './model'

describe('face constraints model', () => {
  it('accepts valid min constraint', () => {
    const parsed = parseFaceConstraint({
      id: 'c1',
      type: 'min',
      facePair: { a: 1, b: 2 },
      valueMm: 12,
    })
    expect(parsed).not.toBeNull()
    if (!parsed) return
    expect(validateFaceConstraint(parsed)).toBe(true)
  })

  it('rejects non-positive max constraint', () => {
    const parsed = parseFaceConstraint({
      id: 'c2',
      type: 'max',
      facePair: { a: 1, b: 2 },
      valueMm: 0,
    })
    expect(parsed).toBeNull()
  })

  it('accepts block without pair', () => {
    const parsed = parseFaceConstraint({
      id: 'c3',
      type: 'block',
      facePair: null,
    })
    expect(parsed).not.toBeNull()
  })

  it('rejects panel with invalid range', () => {
    const parsed = parseFaceConstraint({
      id: 'c4',
      type: 'panel',
      facePair: null,
      thicknessMm: 18,
      minSizeMm: { x: 500, y: 600 },
      maxSizeMm: { x: 200, y: 900 },
    })
    expect(parsed).toBeNull()
  })

  it('accepts panel with min/max pairs', () => {
    const parsed = parseFaceConstraint({
      id: 'c5',
      type: 'panel',
      facePair: null,
      thicknessMm: 18,
      minSizeMm: { x: 200, y: 200 },
      maxSizeMm: { x: 1500, y: 2000 },
    })
    expect(parsed).not.toBeNull()
  })

  it('parses list', () => {
    const parsed = parseFaceConstraintList([
      { id: 'c1', type: 'const', facePair: { a: 2, b: 4 }, valueMm: 10 },
      { id: 'c2', type: 'block', facePair: null },
    ])
    expect(parsed).not.toBeNull()
    expect(parsed?.length).toBe(2)
  })
})
