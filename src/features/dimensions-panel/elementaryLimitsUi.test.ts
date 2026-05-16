import { describe, expect, it } from 'vitest'
import { BufferGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import {
  elementaryPlaneGapRows,
  filterElementaryFaceConstraints,
  formatPlaneGapMmLabel,
} from './elementaryLimitsUi'

describe('filterElementaryFaceConstraints', () => {
  it('keeps only const, min, max, minmax', () => {
    const all: FaceConstraint[] = [
      { id: 'a', type: 'const', facePair: null, valueMm: 1 },
      {
        id: 'b',
        type: 'panel',
        facePair: null,
        thicknessMm: 2,
        panelX: { maxMm: 1 },
        panelY: { maxMm: 1 },
        ySameAsX: true,
        panelMeasureMode: 'bboxExtents',
      },
      { id: 'c', type: 'minmax', facePair: null, minMm: 0, maxMm: 10 },
    ]
    const el = filterElementaryFaceConstraints(all)
    expect(el.map((x) => x.id)).toEqual(['a', 'c'])
  })
})

describe('formatPlaneGapMmLabel', () => {
  it('formats to three decimal places as plain string', () => {
    expect(formatPlaneGapMmLabel(1.23456)).toBe('1.235')
    expect(formatPlaneGapMmLabel(10)).toBe('10')
  })
})

describe('elementaryPlaneGapRows', () => {
  it('returns empty without geometry', () => {
    const constraints: FaceConstraint[] = [{ id: 'x', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 1 }]
    expect(elementaryPlaneGapRows(null, constraints, [])).toEqual([])
  })

  it('returns empty when plane gap cannot be resolved', () => {
    const g = new BufferGeometry()
    const constraints: FaceConstraint[] = [{ id: 'edgeOnly', type: 'const', facePair: null, valueMm: 5 }]
    expect(elementaryPlaneGapRows(g, constraints, [])).toEqual([])
  })
})
