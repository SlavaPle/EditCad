import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { BLOCK_COMPOSITION, matchesComposition } from './compositeLimitComposition'
import { buildBlockInstallBundle, removeBlockAndAuxiliaryConstraints } from './blockInstallBundle'
import type { BlockFaceConstraint, FaceConstraint } from './model'

function makeSimplePanelGeometry(): BufferGeometry {
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
  return g
}

describe('buildBlockInstallBundle', () => {
  it('tworzy trzy CONST i powiązany wpis BLOCK', () => {
    const geometry = makeSimplePanelGeometry()
    const bundle = buildBlockInstallBundle({
      geometry,
      blockId: 'block-1',
      axis0: { elementAId: 'a0', elementBId: 'b0' },
      axis1: { elementAId: 'a1', elementBId: 'b1' },
      axis2: { elementAId: 'a2', elementBId: 'b2' },
      preparedModelElements: [
        { id: 'a0', faceIndices: [0] },
        { id: 'b0', faceIndices: [2] },
        { id: 'a1', faceIndices: [1] },
        { id: 'b1', faceIndices: [3] },
        { id: 'a2', faceIndices: [0, 1] },
        { id: 'b2', faceIndices: [2, 3] },
      ],
    })
    if ('ok' in bundle) {
      expect.fail(`bundle failed: ${bundle.reason}`)
    }
    expect(bundle.auxiliaryConstraints).toHaveLength(3)
    expect(bundle.auxiliaryConstraints.every((c) => c.type === 'const')).toBe(true)
    expect(bundle.block.axis0ConstId).toBe('block-1-axis0-const')
    expect(
      matchesComposition(
        bundle.auxiliaryConstraints.map((c) => c.type as 'const'),
        BLOCK_COMPOSITION,
      ),
    ).toBe(true)
  })

  it('zwraca błąd przy brakujących elementach', () => {
    const geometry = makeSimplePanelGeometry()
    const result = buildBlockInstallBundle({
      geometry,
      blockId: 'block-1',
      axis0: { elementAId: 'missing', elementBId: 'b0' },
      axis1: { elementAId: 'a1', elementBId: 'b1' },
      axis2: { elementAId: 'a2', elementBId: 'b2' },
      preparedModelElements: [{ id: 'b0', faceIndices: [0] }],
    })
    expect(result).toEqual({ ok: false, reason: 'missingAxisElements' })
  })
})

describe('removeBlockAndAuxiliaryConstraints', () => {
  it('usuwa marker BLOCK bez powiązanych const', () => {
    const list: FaceConstraint[] = [
      { id: 'bk', type: 'block', facePair: null },
      { id: 'mm', type: 'minmax', facePair: { a: 0, b: 1 }, minMm: 1, maxMm: 5 },
    ]
    expect(removeBlockAndAuxiliaryConstraints(list, 'bk').map((c) => c.id)).toEqual(['mm'])
  })

  it('usuwa BLOCK i powiązane const', () => {
    const block: BlockFaceConstraint = {
      id: 'bk',
      type: 'block',
      facePair: null,
      axis0ConstId: 'c0',
      axis1ConstId: 'c1',
      axis2ConstId: 'c2',
    }
    const list: FaceConstraint[] = [
      block,
      { id: 'c0', type: 'const', facePair: { a: 0, b: 1 }, valueMm: 1 },
      { id: 'c1', type: 'const', facePair: { a: 2, b: 3 }, valueMm: 2 },
      { id: 'c2', type: 'const', facePair: { a: 4, b: 5 }, valueMm: 3 },
      { id: 'other', type: 'minmax', facePair: { a: 6, b: 7 }, minMm: 0, maxMm: 10 },
    ]
    expect(removeBlockAndAuxiliaryConstraints(list, 'bk').map((c) => c.id)).toEqual(['other'])
  })
})
