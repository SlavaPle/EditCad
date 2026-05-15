import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import {
  collectCompositeAuxiliaryConstraintIds,
  filterConstraintsForLeftPanelList,
  hasCompositeLimitInList,
  isVisibleInLeftPanelLimitList,
} from './compositeLimitComposition'
import type { BlockFaceConstraint, FaceConstraint, PanelFaceConstraint, ProfilFaceConstraint } from './model'
import { buildBlockInstallBundle } from './blockInstallBundle'
import { buildPanelInstallBundle } from './panelInstallBundle'
import { buildProfilInstallBundle } from './profilInstallBundle'

function leftPanelVisibleIds(all: readonly FaceConstraint[]): string[] {
  return filterConstraintsForLeftPanelList(all).map((c) => c.id)
}

function leftPanelVisibleTypes(all: readonly FaceConstraint[]): FaceConstraint['type'][] {
  return filterConstraintsForLeftPanelList(all).map((c) => c.type)
}

function makeSimplePanelGeometry(): { geometry: BufferGeometry; thicknessFaces: number[] } {
  const g = new BufferGeometry()
  g.setAttribute(
    'position',
    new Float32BufferAttribute(
      new Float32Array([
        -10, -10, 0, 10, -10, 0, 10, 10, 0, -10, -10, 0, 10, 10, 0, -10, 10, 0,
        -10, -10, 7, 10, -10, 7, 10, 10, 7, -10, -10, 7, 10, 10, 7, -10, 10, 7,
      ]),
      3,
    ),
  )
  return { geometry: g, thicknessFaces: [0, 1, 2, 3] }
}

describe('hasCompositeLimitInList', () => {
  it('is true when panel, profil, or block present', () => {
    expect(hasCompositeLimitInList([{ id: 'p', type: 'panel', facePair: null, thicknessMm: 1, panelX: { maxMm: 1 }, panelY: { maxMm: 1 }, ySameAsX: true, panelMeasureMode: 'facePairs' }])).toBe(true)
    expect(hasCompositeLimitInList([{ id: 'b', type: 'block', facePair: null }])).toBe(true)
    expect(hasCompositeLimitInList([{ id: 'c', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 1 }])).toBe(false)
  })
})

describe('isVisibleInLeftPanelLimitList', () => {
  const panel: PanelFaceConstraint = {
    id: 'panel-1',
    type: 'panel',
    facePair: null,
    thicknessMm: 5,
    panelX: { maxMm: 100 },
    panelY: { maxMm: 200 },
    ySameAsX: false,
    panelMeasureMode: 'facePairs',
    thicknessConstId: 't-const',
    panelXMinMaxId: 'x-mm',
    panelYMinMaxId: 'y-mm',
  }
  const all: FaceConstraint[] = [
    panel,
    { id: 't-const', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 5 },
    { id: 'x-mm', type: 'minmax', facePair: { a: 2, b: 3 }, minMm: 0, maxMm: 100 },
    { id: 'y-mm', type: 'minmax', facePair: { a: 4, b: 5 }, minMm: 10, maxMm: 200 },
    { id: 'solo-minmax', type: 'minmax', facePair: { a: 6, b: 7 }, minMm: 0, maxMm: 50 },
  ]

  it('always shows composite panel row', () => {
    expect(isVisibleInLeftPanelLimitList(panel, all)).toBe(true)
  })

  it('hides linked const and minmax when panel exists', () => {
    expect(isVisibleInLeftPanelLimitList(all[1]!, all)).toBe(false)
    expect(isVisibleInLeftPanelLimitList(all[2]!, all)).toBe(false)
    expect(isVisibleInLeftPanelLimitList(all[3]!, all)).toBe(false)
  })

  it('keeps standalone minmax visible', () => {
    expect(isVisibleInLeftPanelLimitList(all[4]!, all)).toBe(true)
  })
})

describe('left panel list — PANEL install bundle', () => {
  it('shows only PANEL row after full install (const + minmax X + minmax Y hidden)', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-full',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 100, minMm: 5 },
      panelYBounds: { maxMm: 200 },
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
    if ('ok' in bundle) expect.fail('panel bundle failed')
    const all: FaceConstraint[] = [...bundle.auxiliaryConstraints, bundle.panel]
    expect(leftPanelVisibleIds(all)).toEqual(['panel-full'])
    expect(leftPanelVisibleTypes(all)).toEqual(['panel'])
  })

  it('shows only PANEL when ySameAsX (one minmax auxiliary hidden)', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-same',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 50 },
      panelYBounds: { maxMm: 50 },
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
    if ('ok' in bundle) expect.fail('panel bundle failed')
    const all: FaceConstraint[] = [...bundle.auxiliaryConstraints, bundle.panel]
    expect(bundle.auxiliaryConstraints).toHaveLength(2)
    expect(leftPanelVisibleIds(all)).toEqual(['panel-same'])
  })
})

describe('left panel list — PROFIL install bundle', () => {
  it('shows only PROFIL row (minmax stretch + two const hidden)', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildProfilInstallBundle({
      geometry,
      profilId: 'profil-1',
      stretchTriangles: thicknessFaces,
      stretchMaxMm: 12,
      stretchMinMm: 4,
      frozen1ElementAId: 'f1a',
      frozen1ElementBId: 'f1b',
      frozen2ElementAId: 'f2a',
      frozen2ElementBId: 'f2b',
      preparedModelElements: [
        { id: 'f1a', faceIndices: [0] },
        { id: 'f1b', faceIndices: [2] },
        { id: 'f2a', faceIndices: [1] },
        { id: 'f2b', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) expect.fail(`profil bundle failed: ${bundle.reason}`)
    const all: FaceConstraint[] = [...bundle.auxiliaryConstraints, bundle.profil]
    expect(leftPanelVisibleIds(all)).toEqual(['profil-1'])
    expect(collectCompositeAuxiliaryConstraintIds(all).size).toBe(3)
  })
})

describe('left panel list — BLOCK marker', () => {
  it('shows marker-only BLOCK without face selection auxiliaries', () => {
    const block: BlockFaceConstraint = { id: 'bk-only', type: 'block', facePair: null }
    expect(leftPanelVisibleIds([block])).toEqual(['bk-only'])
  })
})

describe('left panel list — BLOCK install bundle', () => {
  it('shows only BLOCK row (three const axes hidden)', () => {
    const { geometry } = makeSimplePanelGeometry()
    const elements = [
      { id: 'a0', faceIndices: [0] },
      { id: 'b0', faceIndices: [2] },
      { id: 'a1', faceIndices: [1] },
      { id: 'b1', faceIndices: [3] },
      { id: 'a2', faceIndices: [0, 1] },
      { id: 'b2', faceIndices: [2, 3] },
    ]
    const bundle = buildBlockInstallBundle({
      geometry,
      blockId: 'block-1',
      axis0: { elementAId: 'a0', elementBId: 'b0' },
      axis1: { elementAId: 'a1', elementBId: 'b1' },
      axis2: { elementAId: 'a2', elementBId: 'b2' },
      preparedModelElements: elements,
    })
    if ('ok' in bundle) expect.fail(`block bundle failed: ${bundle.reason}`)
    const all: FaceConstraint[] = [...bundle.auxiliaryConstraints, bundle.block]
    expect(leftPanelVisibleIds(all)).toEqual(['block-1'])
    expect(bundle.auxiliaryConstraints.every((c) => c.type === 'const')).toBe(true)
  })
})

describe('left panel list — mixed composites and standalone limits', () => {
  it('shows panel + profil + block only when all auxiliaries are linked', () => {
    const panel: PanelFaceConstraint = {
      id: 'p',
      type: 'panel',
      facePair: null,
      thicknessMm: 1,
      panelX: { maxMm: 1 },
      panelY: { maxMm: 1 },
      ySameAsX: true,
      panelMeasureMode: 'facePairs',
      thicknessConstId: 'pc',
      panelXMinMaxId: 'px',
    }
    const profil: ProfilFaceConstraint = {
      id: 'pr',
      type: 'profil',
      facePair: { a: 0, b: 1 },
      valueMm: 10,
      stretchMinMaxId: 'ps',
      frozen1ConstId: 'pf1',
      frozen2ConstId: 'pf2',
    }
    const block: BlockFaceConstraint = {
      id: 'bk',
      type: 'block',
      facePair: null,
      axis0ConstId: 'b0',
      axis1ConstId: 'b1',
      axis2ConstId: 'b2',
    }
    const all: FaceConstraint[] = [
      panel,
      { id: 'pc', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 1 },
      { id: 'px', type: 'minmax', facePair: { a: 2, b: 3 }, minMm: 0, maxMm: 1 },
      profil,
      { id: 'ps', type: 'minmax', facePair: { a: 4, b: 5 }, minMm: 0, maxMm: 10 },
      { id: 'pf1', type: 'const', facePair: { a: 6, b: 7 }, valueMm: 2 },
      { id: 'pf2', type: 'const', facePair: { a: 8, b: 9 }, valueMm: 3 },
      block,
      { id: 'b0', type: 'const', facePair: { a: 10, b: 11 }, valueMm: 4 },
      { id: 'b1', type: 'const', facePair: { a: 12, b: 13 }, valueMm: 5 },
      { id: 'b2', type: 'const', facePair: { a: 14, b: 15 }, valueMm: 6 },
    ]
    expect(leftPanelVisibleIds(all).sort()).toEqual(['bk', 'p', 'pr'].sort())
  })

  it('keeps legacy profil row visible when auxiliary ids are missing', () => {
    const profil: ProfilFaceConstraint = {
      id: 'legacy-pr',
      type: 'profil',
      facePair: { a: 0, b: 1 },
      valueMm: 10,
      frozen1: { elementAId: 'a', elementBId: 'b' },
      frozen2: { elementAId: 'c', elementBId: 'd' },
    }
    const orphanConst: FaceConstraint = {
      id: 'orphan',
      type: 'const',
      facePair: { a: 2, b: 3 },
      valueMm: 5,
    }
    const all = [profil, orphanConst]
    expect(leftPanelVisibleIds(all)).toEqual(['legacy-pr', 'orphan'])
  })

  it('shows min and max types even when panel is present (not composite auxiliaries)', () => {
    const panel: PanelFaceConstraint = {
      id: 'p',
      type: 'panel',
      facePair: null,
      thicknessMm: 1,
      panelX: { maxMm: 1 },
      panelY: { maxMm: 1 },
      ySameAsX: true,
      panelMeasureMode: 'facePairs',
      thicknessConstId: 'tc',
    }
    const all: FaceConstraint[] = [
      panel,
      { id: 'tc', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 1 },
      { id: 'mn', type: 'min', facePair: { a: 2, b: 3 }, valueMm: 1 },
      { id: 'mx', type: 'max', facePair: { a: 4, b: 5 }, valueMm: 9 },
    ]
    expect(leftPanelVisibleTypes(all).sort()).toEqual(['max', 'min', 'panel'].sort())
  })
})

describe('left panel list — no composite limits', () => {
  it('shows every const and minmax when list has only primitives', () => {
    const all: FaceConstraint[] = [
      { id: 'c1', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 5 },
      { id: 'mm', type: 'minmax', facePair: { a: 2, b: 3 }, minMm: 1, maxMm: 9 },
      { id: 'mn', type: 'min', facePair: { a: 4, b: 5 }, valueMm: 2 },
    ]
    expect(leftPanelVisibleIds(all)).toEqual(['c1', 'mm', 'mn'])
  })

  it('does not hide primitives when only block exists without linked const ids', () => {
    const block: BlockFaceConstraint = { id: 'bk', type: 'block', facePair: null }
    const orphan: FaceConstraint = { id: 'c', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 1 }
    const all = [block, orphan]
    expect(leftPanelVisibleIds(all)).toEqual(['bk', 'c'])
  })
})
