import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../pre-assembly/programParts/programPartTransform'
import {
  mateLineWorldFrame,
  parallelLinesDistance,
  parallelLinesPerpendicular,
} from './lineWorldFrame'

function lineAlongX(length: number): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, 0, length, 0, 0, 0, 1, 0], 3),
  )
  geo.computeBoundingBox()
  return geo
}

describe('lineWorldFrame', () => {
  const line = { kind: 'line' as const, partId: 'a', vertexA: 0, vertexB: 1 }

  it('parallelLinesDistance matches perpendicular length for offset lines', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)

    const frameA = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), line)
    const frameB = mateLineWorldFrame(
      geometryB,
      { positionMm: [0, 0, 6], rotationDeg: [0, 0, 0] },
      line,
    )
    if (!frameA || !frameB) throw new Error('missing frame')

    expect(parallelLinesDistance(frameA, frameB)).toBeCloseTo(6, 2)
    expect(parallelLinesPerpendicular(frameA, frameB).length()).toBeCloseTo(6, 2)
  })

  it('parallelLinesDistance is zero for collinear lines', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)
    geometryB.translate(4, 0, 0)

    const frameA = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), line)
    const frameB = mateLineWorldFrame(geometryB, defaultProgramPartTransform(), line)
    if (!frameA || !frameB) throw new Error('missing frame')

    expect(parallelLinesDistance(frameA, frameB)).toBeCloseTo(0, 2)
  })
})
