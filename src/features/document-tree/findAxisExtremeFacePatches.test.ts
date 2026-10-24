import { describe, expect, it } from 'vitest'
import { BoxGeometry } from 'three'
import { findAxisExtremeFacePatches } from './findAxisExtremeFacePatches'

describe('findAxisExtremeFacePatches', () => {
  it('returns two opposite patches along X for a box', () => {
    const geo = new BoxGeometry(10, 4, 6)
    const result = findAxisExtremeFacePatches(geo, 'x')
    expect(result).not.toBeNull()
    expect(result!.faceIndices.length).toBeGreaterThanOrEqual(2)
    expect(result!.seedPositive).not.toBe(result!.seedNegative)
    geo.dispose()
  })

  it('returns patches for Y and Z', () => {
    const geo = new BoxGeometry(2, 8, 3)
    expect(findAxisExtremeFacePatches(geo, 'y')).not.toBeNull()
    expect(findAxisExtremeFacePatches(geo, 'z')).not.toBeNull()
    geo.dispose()
  })
})
