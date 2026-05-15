import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { auxiliaryPrimitiveKinds, matchesComposition, PANEL_COMPOSITION } from './compositeLimitComposition'
import { buildPanelInstallBundle, removePanelAndAuxiliaryConstraints } from './panelInstallBundle'
import type { PanelFaceConstraint } from './model'

function makeSimplePanelGeometry(): { geometry: BufferGeometry; thicknessFaces: number[] } {
  const g = new BufferGeometry()
  const vertices = new Float32Array([
    -10, -10, 0, 10, -10, 0, 10, 10, 0, -10, -10, 0, 10, 10, 0, -10, 10, 0,
    -10, -10, 7, 10, -10, 7, 10, 10, 7, -10, -10, 7, 10, 10, 7, -10, 10, 7,
  ])
  g.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  return { geometry: g, thicknessFaces: [0, 1, 2, 3] }
}

describe('buildPanelInstallBundle', () => {
  it('orders auxiliaries as const then minmax (X then Y)', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-order',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 100, minMm: 10 },
      panelYBounds: { maxMm: 200, minMm: 5 },
      ySameAsX: false,
      panelXElementAId: 'xa',
      panelXElementBId: 'xb',
      panelYElementAId: 'ya',
      panelYElementBId: 'yb',
      preparedModelElements: [
        { id: 'xa', faceIndices: [0] },
        { id: 'xb', faceIndices: [2] },
        { id: 'ya', faceIndices: [1] },
        { id: 'yb', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) expect.fail(`bundle failed: ${bundle.reason}`)
    expect(auxiliaryPrimitiveKinds(bundle.auxiliaryConstraints)).toEqual(['const', 'minmax', 'minmax'])
    expect(matchesComposition(auxiliaryPrimitiveKinds(bundle.auxiliaryConstraints), PANEL_COMPOSITION)).toBe(true)
  })

  it('creates CONST for thickness and MINMAX for X/Y', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-1',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 100, minMm: 10 },
      panelYBounds: { maxMm: 200 },
      ySameAsX: true,
      panelXElementAId: 'xa',
      panelXElementBId: 'xb',
      panelYElementAId: 'ya',
      panelYElementBId: 'yb',
      preparedModelElements: [
        { id: 'xa', faceIndices: [0] },
        { id: 'xb', faceIndices: [2] },
        { id: 'ya', faceIndices: [1] },
        { id: 'yb', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) {
      expect.fail(`bundle failed: ${bundle.reason}`)
    }
    expect(bundle.panel.thicknessConstId).toBe('panel-1-thickness-const')
    const kinds = auxiliaryPrimitiveKinds(bundle.auxiliaryConstraints)
    expect(kinds).toContain('const')
    expect(kinds.filter((t) => t === 'minmax')).toHaveLength(1)
    expect(matchesComposition(kinds, ['const', 'minmax'])).toBe(true)
    expect(matchesComposition(kinds, PANEL_COMPOSITION)).toBe(false)
    const thicknessConst = bundle.auxiliaryConstraints.find((c) => c.type === 'const')
    if (thicknessConst?.type !== 'const') return
    expect(thicknessConst.valueMm).toBe(7)
    expect(bundle.stretchSteps[0]?.targetMm).toBe(7)
  })

  it('links panel record to const and minmax ids', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-links',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 50 },
      panelYBounds: { maxMm: 60 },
      ySameAsX: false,
      panelXElementAId: 'xa',
      panelXElementBId: 'xb',
      panelYElementAId: 'ya',
      panelYElementBId: 'yb',
      preparedModelElements: [
        { id: 'xa', faceIndices: [0] },
        { id: 'xb', faceIndices: [2] },
        { id: 'ya', faceIndices: [1] },
        { id: 'yb', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) expect.fail(`bundle failed: ${bundle.reason}`)
    expect(bundle.panel.thicknessConstId).toBe('panel-links-thickness-const')
    expect(bundle.panel.panelXMinMaxId).toBe('panel-links-axis-x-minmax')
    expect(bundle.panel.panelYMinMaxId).toBe('panel-links-axis-y-minmax')
    const xMm = bundle.auxiliaryConstraints.find((c) => c.id === bundle.panel.panelXMinMaxId)
    expect(xMm?.type).toBe('minmax')
    if (xMm?.type === 'minmax') {
      expect(xMm.elementAId).toBe('xa')
      expect(xMm.elementBId).toBe('xb')
      expect(xMm.maxMm).toBe(50)
    }
  })

  it('emits stretch steps for thickness, X, and Y when ySameAsX is false', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-steps',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 500 },
      panelYBounds: { maxMm: 500 },
      ySameAsX: false,
      panelXElementAId: 'xa',
      panelXElementBId: 'xb',
      panelYElementAId: 'ya',
      panelYElementBId: 'yb',
      preparedModelElements: [
        { id: 'xa', faceIndices: [0] },
        { id: 'xb', faceIndices: [2] },
        { id: 'ya', faceIndices: [1] },
        { id: 'yb', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) expect.fail(`bundle failed: ${bundle.reason}`)
    expect(bundle.stretchSteps).toHaveLength(3)
    expect(bundle.stretchSteps[0]?.panelThicknessMergedFaces?.length).toBeGreaterThan(0)
  })

  it('emits two stretch steps when ySameAsX (no separate Y minmax)', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-steps-same',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 500 },
      panelYBounds: { maxMm: 500 },
      ySameAsX: true,
      panelXElementAId: 'xa',
      panelXElementBId: 'xb',
      panelYElementAId: 'ya',
      panelYElementBId: 'yb',
      preparedModelElements: [
        { id: 'xa', faceIndices: [0] },
        { id: 'xb', faceIndices: [2] },
        { id: 'ya', faceIndices: [1] },
        { id: 'yb', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) expect.fail(`bundle failed: ${bundle.reason}`)
    expect(bundle.stretchSteps).toHaveLength(2)
    expect(bundle.panel.panelYMinMaxId).toBeUndefined()
    expect(bundle.auxiliaryConstraints).toHaveLength(2)
  })

  it('returns missingSpanElements when span elements are absent', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const result = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-fail',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 10 },
      panelYBounds: { maxMm: 10 },
      ySameAsX: false,
      panelXElementAId: 'missing',
      panelXElementBId: 'xb',
      panelYElementAId: 'ya',
      panelYElementBId: 'yb',
      preparedModelElements: [{ id: 'xb', faceIndices: [0] }],
    })
    expect(result).toEqual({ ok: false, reason: 'missingSpanElements' })
  })
})

describe('removePanelAndAuxiliaryConstraints', () => {
  it('removes panel and linked auxiliary ids', () => {
    const panel: PanelFaceConstraint = {
      id: 'p1',
      type: 'panel',
      facePair: null,
      thicknessMm: 5,
      panelX: { maxMm: 10 },
      panelY: { maxMm: 10 },
      ySameAsX: true,
      panelMeasureMode: 'facePairs',
      thicknessConstId: 'c1',
      panelXMinMaxId: 'mx',
    }
    const list: import('./model').FaceConstraint[] = [
      panel,
      { id: 'c1', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 5 },
      { id: 'mx', type: 'minmax', facePair: { a: 0, b: 1 }, minMm: 0, maxMm: 10 },
      { id: 'other', type: 'block', facePair: null },
    ]
    const next = removePanelAndAuxiliaryConstraints(list, 'p1')
    expect(next.map((c) => c.id)).toEqual(['other'])
  })
})
