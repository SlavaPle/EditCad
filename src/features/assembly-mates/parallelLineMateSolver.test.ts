import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../pre-assembly/programParts/programPartTransform'
import { mateLineWorldFrame, parallelLinesPerpendicular } from './lineWorldFrame'
import { solveParallelLineMate } from './parallelLineMateSolver'

function lineAlongX(length: number): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, 0, length, 0, 0, 0, 1, 0], 3),
  )
  geo.computeBoundingBox()
  return geo
}

describe('parallelLineMateSolver', () => {
  const lineA = { kind: 'line' as const, partId: 'a', vertexA: 0, vertexB: 1 }
  const lineB = { kind: 'line' as const, partId: 'b', vertexA: 0, vertexB: 1 }

  it('aligns line directions face-to-face', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)
    geometryB.rotateZ(Math.PI / 2)

    const result = solveParallelLineMate({
      lineA,
      lineB,
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      alignment: 'faceToFace',
      offsetMm: 0,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), lineA)
    const frameB = mateLineWorldFrame(geometryB, result.transform, lineB)
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(frameB.direction.dot(frameA.direction)).toBeCloseTo(-1, 2)
  })

  it('makes lines collinear when distance is zero', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)
    geometryB.translate(0, 5, 3)
    geometryB.rotateZ(Math.PI / 4)

    const result = solveParallelLineMate({
      lineA,
      lineB,
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: { positionMm: [40, -10, 20], rotationDeg: [0, 0, 0] },
      alignment: 'sameDirection',
      offsetMm: 0,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), lineA)
    const frameB = mateLineWorldFrame(geometryB, result.transform, lineB)
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(frameB.direction.dot(frameA.direction)).toBeCloseTo(1, 2)
    expect(parallelLinesPerpendicular(frameA, frameB).length()).toBeCloseTo(0, 2)
  })

  it('keeps parallel offset when distance is non-zero', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)
    geometryB.translate(0, 4, 0)

    const result = solveParallelLineMate({
      lineA,
      lineB,
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      alignment: 'sameDirection',
      offsetMm: 2,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), lineA)
    const frameB = mateLineWorldFrame(geometryB, result.transform, lineB)
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(parallelLinesPerpendicular(frameA, frameB).length()).toBeCloseTo(2, 2)
  })
})
