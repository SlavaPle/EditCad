import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  absoluteInPlaneLineDirection,
  parallelAlignedTarget,
} from './parallelOrientationTargets'

describe('parallelOrientationTargets', () => {
  it('parallelAlignedTarget is absolute ±reference', () => {
    const n = new Vector3(0, 0, 1)
    expect(parallelAlignedTarget(n, 'sameDirection').z).toBeCloseTo(1)
    expect(parallelAlignedTarget(n, 'faceToFace').z).toBeCloseTo(-1)
  })

  it('absoluteInPlaneLineDirection is absolute 0/1 (not a relative toggle)', () => {
    const n = new Vector3(0, 0, 1)
    const fromPlus = new Vector3(1, 0, 0)
    const fromMinus = new Vector3(-1, 0, 0)

    const sameFromPlus = absoluteInPlaneLineDirection(n, fromPlus, 'sameDirection')
    const sameFromMinus = absoluteInPlaneLineDirection(n, fromMinus, 'sameDirection')
    const faceFromPlus = absoluteInPlaneLineDirection(n, fromPlus, 'faceToFace')
    const faceFromMinus = absoluteInPlaneLineDirection(n, fromMinus, 'faceToFace')

    expect(sameFromPlus.distanceTo(sameFromMinus)).toBeLessThan(1e-6)
    expect(faceFromPlus.distanceTo(faceFromMinus)).toBeLessThan(1e-6)
    expect(sameFromPlus.dot(faceFromPlus)).toBeCloseTo(-1, 5)
  })
})
