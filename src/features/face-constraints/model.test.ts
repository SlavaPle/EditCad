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

  it('rejects legacy panel when min exceeds max on an axis', () => {
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

  it('rejects panel when axis minMm exceeds maxMm (modern)', () => {
    const parsed = parseFaceConstraint({
      id: 'c4b',
      type: 'panel',
      facePair: null,
      thicknessMm: 18,
      panelX: { minMm: 500, maxMm: 200 },
      panelY: { maxMm: 900 },
      ySameAsX: false,
    })
    expect(parsed).toBeNull()
  })

  it('accepts CONST on edge vertices only', () => {
    const parsed = parseFaceConstraint({
      id: 'c-edge',
      type: 'const',
      facePair: null,
      valueMm: 100,
      edgeVertexPair: { va: 0, vb: 1 },
    })
    expect(parsed).not.toBeNull()
    expect(parsed?.type).toBe('const')
  })

  it('accepts pairwise constraint tied by element ids', () => {
    const parsed = parseFaceConstraint({
      id: 'c6',
      type: 'max',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 999,
    })
    expect(parsed).not.toBeNull()
    if (!parsed || parsed.type !== 'max') return
    expect(parsed.elementAId).toBe('ea')
    expect(parsed.elementBId).toBe('eb')
  })

  it('accepts legacy panel with min/max pairs', () => {
    const parsed = parseFaceConstraint({
      id: 'c5',
      type: 'panel',
      facePair: null,
      thicknessMm: 18,
      minSizeMm: { x: 200, y: 200 },
      maxSizeMm: { x: 1500, y: 2000 },
    })
    expect(parsed).not.toBeNull()
    if (!parsed || parsed.type !== 'panel') return
    expect(parsed.panelX).toEqual({ minMm: 200, maxMm: 1500 })
    expect(parsed.panelY).toEqual({ minMm: 200, maxMm: 2000 })
    expect(parsed.ySameAsX).toBe(false)
  })

  it('accepts panel max-only on axes', () => {
    const parsed = parseFaceConstraint({
      id: 'c5b',
      type: 'panel',
      facePair: null,
      thicknessMm: 10,
      panelX: { maxMm: 1500 },
      panelY: { maxMm: 2000 },
      ySameAsX: false,
    })
    expect(parsed).not.toBeNull()
    if (!parsed || parsed.type !== 'panel') return
    expect(parsed.panelX.minMm).toBeUndefined()
  })

  it('accepts panel with ySameAsX and duplicated panelY', () => {
    const parsed = parseFaceConstraint({
      id: 'c5c',
      type: 'panel',
      facePair: null,
      thicknessMm: 12,
      panelX: { minMm: 100, maxMm: 800 },
      panelY: { minMm: 100, maxMm: 800 },
      ySameAsX: true,
    })
    expect(parsed).not.toBeNull()
    if (!parsed || parsed.type !== 'panel') return
    expect(parsed.ySameAsX).toBe(true)
    expect(parsed.panelY).toEqual(parsed.panelX)
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
