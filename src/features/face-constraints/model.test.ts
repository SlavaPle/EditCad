import { describe, expect, it } from 'vitest'
import {
  formatProfilStretchGapLabelMm,
  parseFaceConstraint,
  parseFaceConstraintList,
  validateFaceConstraint,
} from './model'

const facePairIds = {
  panelMeasureMode: 'facePairs',
  panelXElementAId: 'xa',
  panelXElementBId: 'xb',
  panelYElementAId: 'ya',
  panelYElementBId: 'yb',
} as const

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
      ...facePairIds,
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

  it('maps legacy panel to bbox measure mode', () => {
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
    expect(parsed.panelMeasureMode).toBe('bboxExtents')
  })

  it('accepts modern panel face-pair mode max-only', () => {
    const parsed = parseFaceConstraint({
      id: 'c5b',
      type: 'panel',
      facePair: null,
      thicknessMm: 10,
      panelX: { maxMm: 1500 },
      panelY: { maxMm: 2000 },
      ySameAsX: false,
      ...facePairIds,
    })
    expect(parsed).not.toBeNull()
    if (!parsed || parsed.type !== 'panel') return
    expect(parsed.panelX.minMm).toBeUndefined()
    expect(parsed.panelMeasureMode).toBe('facePairs')
    expect(parsed.panelXElementAId).toBe('xa')
  })

  it('inherits facePairs when four element ids exist without explicit mode', () => {
    const parsed = parseFaceConstraint({
      id: 'c-inf',
      type: 'panel',
      facePair: null,
      thicknessMm: 5,
      panelX: { maxMm: 1 },
      panelY: { maxMm: 2 },
      ySameAsX: false,
      panelXElementAId: 'a',
      panelXElementBId: 'b',
      panelYElementAId: 'c',
      panelYElementBId: 'd',
    })
    expect(parsed?.type).toBe('panel')
    if (!parsed || parsed.type !== 'panel') return
    expect(parsed.panelMeasureMode).toBe('facePairs')
  })

  it('rejects explicit facePairs without all ids', () => {
    expect(
      parseFaceConstraint({
        id: 'bad-fp',
        type: 'panel',
        facePair: null,
        thicknessMm: 4,
        panelX: { maxMm: 10 },
        panelY: { maxMm: 20 },
        ySameAsX: false,
        panelMeasureMode: 'facePairs',
        panelXElementAId: 'a',
        panelXElementBId: 'b',
      }),
    ).toBeNull()
  })

  it('accepts bbox mode when explicitly set even if ids omitted', () => {
    const parsed = parseFaceConstraint({
      id: 'bbox',
      type: 'panel',
      facePair: null,
      thicknessMm: 3,
      panelX: { maxMm: 100 },
      panelY: { maxMm: 200 },
      panelMeasureMode: 'bboxExtents',
      ySameAsX: false,
    })
    expect(parsed?.type).toBe('panel')
    if (!parsed || parsed.type !== 'panel') return
    expect(parsed.panelMeasureMode).toBe('bboxExtents')
  })

  it('accepts panel with ySameAsX and duplicated ids', () => {
    const parsed = parseFaceConstraint({
      id: 'c5c',
      type: 'panel',
      facePair: null,
      thicknessMm: 12,
      panelX: { minMm: 100, maxMm: 800 },
      panelY: { minMm: 100, maxMm: 800 },
      ySameAsX: true,
      panelMeasureMode: 'facePairs',
      panelXElementAId: 'p1',
      panelXElementBId: 'p2',
      panelYElementAId: 'p1',
      panelYElementBId: 'p2',
    })
    expect(parsed).not.toBeNull()
    if (!parsed || parsed.type !== 'panel') return
    expect(parsed.panelY).toEqual(parsed.panelX)
  })

  it('parses legacy profil without frozen slots', () => {
    const parsed = parseFaceConstraint({
      id: 'pf',
      type: 'profil',
      facePair: { a: 1, b: 2 },
      valueMm: 120,
    })
    expect(parsed?.type).toBe('profil')
    if (!parsed || parsed.type !== 'profil') return
    expect(parsed.frozen1).toBeUndefined()
    expect(parsed.frozen2).toBeUndefined()
  })

  it('parses profil with two frozen element pairs', () => {
    const parsed = parseFaceConstraint({
      id: 'pf2',
      type: 'profil',
      facePair: { a: 0, b: 1 },
      elementAId: 's-a',
      elementBId: 's-b',
      valueMm: 200,
      frozen1: { elementAId: 'a1', elementBId: 'b1' },
      frozen2: { elementAId: 'a2', elementBId: 'b2' },
    })
    expect(parsed?.type).toBe('profil')
    if (!parsed || parsed.type !== 'profil') return
    expect(parsed.frozen1?.elementAId).toBe('a1')
    expect(parsed.frozen2?.elementBId).toBe('b2')
  })

  it('rejects profil when only one frozen slot is provided', () => {
    expect(
      parseFaceConstraint({
        id: 'bad-pf',
        type: 'profil',
        facePair: { a: 0, b: 1 },
        valueMm: 10,
        frozen1: { elementAId: 'x', elementBId: 'y' },
      }),
    ).toBeNull()
  })

  it('parses profil stretch MIN and MAX band', () => {
    const parsed = parseFaceConstraint({
      id: 'pf-mm',
      type: 'profil',
      facePair: { a: 0, b: 1 },
      elementAId: 's-a',
      elementBId: 's-b',
      valueMm: 100,
      stretchMinMm: 20,
      frozen1: { elementAId: 'a1', elementBId: 'b1' },
      frozen2: { elementAId: 'a2', elementBId: 'b2' },
    })
    expect(parsed?.type).toBe('profil')
    if (!parsed || parsed.type !== 'profil') return
    expect(parsed.stretchMinMm).toBe(20)
    expect(formatProfilStretchGapLabelMm(parsed)).toBe('20…100')
  })

  it('rejects profil when stretch MIN exceeds MAX', () => {
    expect(
      parseFaceConstraint({
        id: 'pf-bad-mm',
        type: 'profil',
        facePair: { a: 0, b: 1 },
        elementAId: 's-a',
        elementBId: 's-b',
        valueMm: 10,
        stretchMinMm: 50,
        frozen1: { elementAId: 'a1', elementBId: 'b1' },
        frozen2: { elementAId: 'a2', elementBId: 'b2' },
      }),
    ).toBeNull()
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
