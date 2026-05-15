import { describe, expect, it } from 'vitest'
import type { PanelFaceConstraint } from './model'
import { syncPanelAuxiliaryConstraints } from './syncPanelAuxiliaryConstraints'

describe('syncPanelAuxiliaryConstraints', () => {
  const panel: PanelFaceConstraint = {
    id: 'p1',
    type: 'panel',
    facePair: null,
    thicknessMm: 8,
    panelX: { maxMm: 100, minMm: 10 },
    panelY: { maxMm: 200, minMm: 20 },
    ySameAsX: false,
    panelMeasureMode: 'bboxExtents',
    thicknessConstId: 'tc',
    panelXMinMaxId: 'mx',
    panelYMinMaxId: 'my',
  }

  it('synchronizes const and both minmax auxiliaries', () => {
    const list = [
      panel,
      { id: 'tc', type: 'const' as const, facePair: { a: 0, b: 1 }, valueMm: 5 },
      { id: 'mx', type: 'minmax' as const, facePair: { a: 2, b: 3 }, minMm: 1, maxMm: 50 },
      { id: 'my', type: 'minmax' as const, facePair: { a: 4, b: 5 }, minMm: 2, maxMm: 60 },
    ]
    const next = syncPanelAuxiliaryConstraints(list, panel)
    expect(next.find((c) => c.id === 'tc')).toMatchObject({ type: 'const', valueMm: 8 })
    expect(next.find((c) => c.id === 'mx')).toMatchObject({ type: 'minmax', minMm: 10, maxMm: 100 })
    expect(next.find((c) => c.id === 'my')).toMatchObject({ type: 'minmax', minMm: 20, maxMm: 200 })
  })

  it('updates only X minmax when ySameAsX', () => {
    const sameY: PanelFaceConstraint = {
      ...panel,
      ySameAsX: true,
      panelY: { maxMm: 100, minMm: 10 },
      panelYMinMaxId: undefined,
    }
    const list = [
      sameY,
      { id: 'tc', type: 'const' as const, facePair: { a: 0, b: 1 }, valueMm: 5 },
      { id: 'mx', type: 'minmax' as const, facePair: { a: 2, b: 3 }, minMm: 1, maxMm: 50 },
    ]
    const next = syncPanelAuxiliaryConstraints(list, sameY)
    expect(next.find((c) => c.id === 'my')).toBeUndefined()
    expect(next.find((c) => c.id === 'mx')).toMatchObject({ maxMm: 100, minMm: 10 })
  })

  it('sets minMm to 0 on linked minmax when panel axis has no minimum', () => {
    const maxOnly: PanelFaceConstraint = {
      ...panel,
      panelX: { maxMm: 80 },
      panelY: { maxMm: 90 },
    }
    const list = [
      maxOnly,
      { id: 'tc', type: 'const' as const, facePair: { a: 0, b: 1 }, valueMm: 5 },
      { id: 'mx', type: 'minmax' as const, facePair: { a: 2, b: 3 }, minMm: 10, maxMm: 50 },
      { id: 'my', type: 'minmax' as const, facePair: { a: 4, b: 5 }, minMm: 11, maxMm: 60 },
    ]
    const next = syncPanelAuxiliaryConstraints(list, maxOnly)
    expect(next.find((c) => c.id === 'mx')).toMatchObject({ minMm: 0, maxMm: 80 })
    expect(next.find((c) => c.id === 'my')).toMatchObject({ minMm: 0, maxMm: 90 })
  })

  it('updates panel row and leaves unrelated constraints', () => {
    const updated: PanelFaceConstraint = { ...panel, thicknessMm: 12 }
    const list = [
      { ...panel, thicknessMm: 5 },
      { id: 'tc', type: 'const' as const, facePair: { a: 0, b: 1 }, valueMm: 5 },
      { id: 'mx', type: 'minmax' as const, facePair: { a: 2, b: 3 }, minMm: 1, maxMm: 50 },
      { id: 'my', type: 'minmax' as const, facePair: { a: 4, b: 5 }, minMm: 2, maxMm: 60 },
      { id: 'other', type: 'block' as const, facePair: null },
    ]
    const next = syncPanelAuxiliaryConstraints(list, updated)
    expect(next.find((c) => c.id === 'p1')).toMatchObject({ type: 'panel', thicknessMm: 12 })
    expect(next.find((c) => c.id === 'other')).toMatchObject({ type: 'block' })
  })

  it('skips missing auxiliary ids without throwing', () => {
    const bare: PanelFaceConstraint = {
      id: 'p2',
      type: 'panel',
      facePair: null,
      thicknessMm: 3,
      panelX: { maxMm: 10 },
      panelY: { maxMm: 10 },
      ySameAsX: true,
      panelMeasureMode: 'facePairs',
    }
    const next = syncPanelAuxiliaryConstraints([bare], bare)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'p2', thicknessMm: 3 })
  })
})
