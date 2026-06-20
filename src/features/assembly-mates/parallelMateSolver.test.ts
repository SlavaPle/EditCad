import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../pre-assembly/programParts/programPartTransform'
import { matePlaneWorldFrame } from './planeWorldFrame'
import { solveParallelMate } from './parallelMateSolver'

function quadInPlaneZ(z: number, facingUp: boolean): BufferGeometry {
  const geo = new BufferGeometry()
  const positions = facingUp
    ? [
        0, 0, z, 10, 0, z, 10, 10, z, //
        0, 0, z, 10, 10, z, 0, 10, z,
      ]
    : [
        0, 0, z, 10, 10, z, 10, 0, z, //
        0, 0, z, 0, 10, z, 10, 10, z,
      ]
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.computeBoundingBox()
  return geo
}

describe('parallelMateSolver', () => {
  it('aligns face-to-face with zero offset', () => {
    const geometryA = quadInPlaneZ(0, true)
    const geometryB = quadInPlaneZ(10, false)
    const planeRef = { partId: 'x', faceIndex: 0, faceIndices: [0, 1] }

    const result = solveParallelMate({
      planeA: { ...planeRef, partId: 'a' },
      planeB: { ...planeRef, partId: 'b' },
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: {
        positionMm: [0, 0, 0],
        rotationDeg: [0, 0, 0],
      },
      alignment: 'faceToFace',
      offsetMm: 0,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = matePlaneWorldFrame(geometryA, defaultProgramPartTransform(), [0, 1])
    const frameB = matePlaneWorldFrame(geometryB, result.transform, [0, 1])
    if (!frameA || !frameB) throw new Error('missing frame')
    const gap = frameB.point.clone().sub(frameA.point).dot(frameA.normal)
    expect(gap).toBeCloseTo(0, 2)
  })

  it('respects offset along plane A normal', () => {
    const geometryA = quadInPlaneZ(0, true)
    const geometryB = quadInPlaneZ(10, false)
    const planeRef = { partId: 'x', faceIndex: 0, faceIndices: [0, 1] }

    const result = solveParallelMate({
      planeA: { ...planeRef, partId: 'a' },
      planeB: { ...planeRef, partId: 'b' },
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      alignment: 'faceToFace',
      offsetMm: 3,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = matePlaneWorldFrame(geometryA, defaultProgramPartTransform(), [0, 1])
    const frameB = matePlaneWorldFrame(geometryB, result.transform, [0, 1])
    if (!frameA || !frameB) throw new Error('missing frame')
    const gap = frameB.point.clone().sub(frameA.point).dot(frameA.normal)
    expect(gap).toBeCloseTo(3, 2)
  })

  it('rejects non-parallel planes', () => {
    const geometryA = quadInPlaneZ(0, true)
    const geometrySide = quadInPlaneZ(0, true)
    geometrySide.rotateX(Math.PI / 2)

    const result = solveParallelMate({
      planeA: { partId: 'a', faceIndex: 0, faceIndices: [0, 1] },
      planeB: { partId: 'b', faceIndex: 0, faceIndices: [0, 1] },
      geometryA,
      geometryB: geometrySide,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      alignment: 'faceToFace',
      offsetMm: 0,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('notParallel')
  })
})
