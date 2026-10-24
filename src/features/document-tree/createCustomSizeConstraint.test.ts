import { describe, expect, it } from 'vitest'
import { BoxGeometry } from 'three'
import { findAxisExtremeFacePatches } from './findAxisExtremeFacePatches'
import { createCustomSizeConstraint } from './createCustomSizeConstraint'

describe('createCustomSizeConstraint', () => {
  it('creates named minmax constraint from opposite box faces', () => {
    const geo = new BoxGeometry(10, 4, 6)
    const patches = findAxisExtremeFacePatches(geo, 'x')!
    const result = createCustomSizeConstraint({
      geometry: geo,
      existingElements: [],
      mergedFaceIndices: patches.faceIndices,
      targetMm: 12,
      displayName: 'Length',
      type: 'minmax',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.constraint.displayName).toBe('Length')
    expect(result.constraint.type).toBe('minmax')
    expect(result.modelElements.length).toBe(2)
    geo.dispose()
  })
})
