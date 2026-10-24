import { describe, expect, it } from 'vitest'
import { BoxGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import { findAxisExtremeFacePatches } from './findAxisExtremeFacePatches'
import {
  isCustomSizeConstraint,
  resolveCanonicalSizeNodeBinding,
} from './resolveSizeNodeBinding'

describe('resolveCanonicalSizeNodeBinding', () => {
  it('marks free axis editable with extreme faces on a box', () => {
    const geo = new BoxGeometry(10, 4, 6)
    const binding = resolveCanonicalSizeNodeBinding({
      geometry: geo,
      modelElements: [],
      constraints: [],
      axis: 'x',
      sizeMm: 10,
    })
    expect(binding.editable).toBe(true)
    expect(binding.status).toBe('free')
    expect(binding.faceIndices.length).toBeGreaterThanOrEqual(2)
    geo.dispose()
  })

  it('keeps renamed world-aligned constraint on canonical axis (not custom)', () => {
    const geo = new BoxGeometry(10, 4, 6)
    const patches = findAxisExtremeFacePatches(geo, 'x')!
    const named: FaceConstraint = {
      id: 'x-named',
      type: 'minmax',
      facePair: { a: patches.seedPositive, b: patches.seedNegative },
      minMm: 0,
      maxMm: 100,
      displayName: 'Length',
    }
    expect(isCustomSizeConstraint(geo, [], named)).toBe(false)
    const binding = resolveCanonicalSizeNodeBinding({
      geometry: geo,
      modelElements: [],
      constraints: [named],
      axis: 'x',
      sizeMm: 10,
    })
    expect(binding.editable).toBe(true)
    expect(binding.displayName).toBe('Length')
    expect(binding.constraintId).toBe('x-named')
    expect(binding.lockReason).toBe('none')
    geo.dispose()
  })

  it('locks all axes when block is present', () => {
    const geo = new BoxGeometry(2, 2, 2)
    const block: FaceConstraint = { id: 'blk', type: 'block', facePair: null }
    const binding = resolveCanonicalSizeNodeBinding({
      geometry: geo,
      modelElements: [],
      constraints: [block],
      axis: 'y',
      sizeMm: 2,
    })
    expect(binding.editable).toBe(false)
    expect(binding.status).toBe('block')
    geo.dispose()
  })
})
