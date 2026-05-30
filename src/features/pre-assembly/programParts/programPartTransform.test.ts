import { describe, expect, it } from 'vitest'
import {
  defaultProgramPartTransform,
  programPartGroupPosition,
  programPartGroupRotation,
  updateProgramPartInList,
} from './programPartTransform'

describe('programPartTransform', () => {
  it('default transform is origin', () => {
    expect(defaultProgramPartTransform()).toEqual({
      positionMm: [0, 0, 0],
      rotationDeg: [0, 0, 0],
    })
  })

  it('maps mm position to scene units', () => {
    const pos = programPartGroupPosition({
      positionMm: [10, 20, 30],
      rotationDeg: [0, 0, 0],
    })
    expect(pos).toEqual([10, 20, 30])
  })

  it('converts rotation degrees to radians', () => {
    const rot = programPartGroupRotation({
      positionMm: [0, 0, 0],
      rotationDeg: [90, 0, 0],
    })
    expect(rot[0]).toBeCloseTo(Math.PI / 2)
  })

  it('updates transform for matching part id', () => {
    const parts = [
      { id: 'a', transform: defaultProgramPartTransform() },
      { id: 'b', transform: defaultProgramPartTransform() },
    ]
    const next = updateProgramPartInList(parts, 'b', {
      positionMm: [1, 2, 3],
      rotationDeg: [0, 45, 0],
    })
    expect(next[1]?.transform.positionMm).toEqual([1, 2, 3])
    expect(next[0]?.transform.positionMm).toEqual([0, 0, 0])
  })
})
