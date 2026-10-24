import { describe, expect, it } from 'vitest'
import { BoxGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import { findAxisExtremeFacePatches } from './findAxisExtremeFacePatches'
import { buildCustomSizeTreeNodes } from './buildCustomSizeTreeNodes'

describe('buildCustomSizeTreeNodes', () => {
  it('does not treat renamed world-aligned (canonical) size as custom', () => {
    const geo = new BoxGeometry(10, 4, 6)
    const patches = findAxisExtremeFacePatches(geo, 'x')!
    const constraint: FaceConstraint = {
      id: 'len-1',
      type: 'minmax',
      facePair: { a: patches.seedPositive, b: patches.seedNegative },
      minMm: 0,
      maxMm: 200,
      displayName: 'Length',
    }
    const nodes = buildCustomSizeTreeNodes({
      prefix: 'part:main',
      geometry: geo,
      modelElements: [],
      constraints: [constraint],
    })
    expect(nodes).toHaveLength(0)
    geo.dispose()
  })

  it('skips unnamed world-aligned constraints', () => {
    const geo = new BoxGeometry(10, 4, 6)
    const patches = findAxisExtremeFacePatches(geo, 'x')!
    const constraint: FaceConstraint = {
      id: 'plain',
      type: 'minmax',
      facePair: { a: patches.seedPositive, b: patches.seedNegative },
      minMm: 0,
      maxMm: 200,
    }
    const nodes = buildCustomSizeTreeNodes({
      prefix: 'part:main',
      geometry: geo,
      modelElements: [],
      constraints: [constraint],
    })
    expect(nodes).toHaveLength(0)
    geo.dispose()
  })
})
