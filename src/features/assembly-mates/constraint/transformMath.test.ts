import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../../pre-assembly/programParts/programPartTransform'
import { applyRigidDeltaToTransform } from './transformMath'

describe('applyRigidDeltaToTransform', () => {
  it('translates follower by anchor translation delta', () => {
    const anchorBefore = defaultProgramPartTransform()
    const anchorAfter = { positionMm: [20, 0, 0] as [number, number, number], rotationDeg: [0, 0, 0] }
    const follower = { positionMm: [5, 10, 0] as [number, number, number], rotationDeg: [0, 0, 0] }

    const next = applyRigidDeltaToTransform(follower, anchorBefore, anchorAfter)
    expect(next.positionMm[0]).toBeCloseTo(25, 2)
    expect(next.positionMm[1]).toBeCloseTo(10, 2)
  })
})
