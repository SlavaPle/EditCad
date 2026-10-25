import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../../pre-assembly/programParts/programPartTransform'
import { mateLineWorldFrame } from '../lineWorldFrame'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import { signedLinePlaneDistance } from './transformMath'
import { projectLinePlane, projectPlaneLine } from './projectLinePlane'

function planeZ(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, 0, 10, 0, 0, 0, 10, 0], 3),
  )
  geo.computeBoundingBox()
  return geo
}

/** Linia wzdłuż Z — startowo prostopadła do płaszczyzny XY. */
function lineAlongZ(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, 0, 0, 0, 10, 1, 0, 0], 3),
  )
  geo.computeBoundingBox()
  return geo
}

function lineAlongX(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, 5, 10, 0, 5, 0, 1, 5], 3),
  )
  geo.computeBoundingBox()
  return geo
}

describe('projectPlaneLine (parallel: plane ∥ line)', () => {
  const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0] }
  const lineB = { kind: 'line' as const, partId: 'b', vertexA: 0, vertexB: 1 }

  it('makes initially perpendicular line parallel to plane', () => {
    const result = projectPlaneLine({
      planeA,
      lineB,
      geometryA: planeZ(),
      geometryB: lineAlongZ(),
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      offsetMm: 0,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const plane = matePlaneWorldFrame(planeZ(), defaultProgramPartTransform(), [0])!
    const line = mateLineWorldFrame(lineAlongZ(), result.transform, lineB)!
    expect(Math.abs(line.direction.dot(plane.normal))).toBeCloseTo(0, 3)
    expect(
      Math.abs(signedLinePlaneDistance(line.point, line.direction, plane.point, plane.normal)),
    ).toBeCloseTo(0, 2)
  })

  it('keeps parallel line and sets offset', () => {
    const result = projectPlaneLine({
      planeA,
      lineB,
      geometryA: planeZ(),
      geometryB: lineAlongX(),
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      offsetMm: 3,
      alignment: 'sameDirection',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const plane = matePlaneWorldFrame(planeZ(), defaultProgramPartTransform(), [0])!
    const line = mateLineWorldFrame(lineAlongX(), result.transform, lineB)!
    expect(Math.abs(line.direction.dot(plane.normal))).toBeCloseTo(0, 3)
    expect(
      Math.abs(signedLinePlaneDistance(line.point, line.direction, plane.point, plane.normal)),
    ).toBeCloseTo(3, 2)
  })

  it('orientation flip is absolute 0/1 from either starting direction', () => {
    const geo = lineAlongX()
    const base = {
      planeA,
      lineB,
      geometryA: planeZ(),
      geometryB: geo,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      offsetMm: 0,
    }
    const sameA = projectPlaneLine({ ...base, alignment: 'sameDirection' })
    expect(sameA.ok).toBe(true)
    if (!sameA.ok) return

    // Start from already-flipped pose — sameDirection must still converge to the same absolute dir
    const sameB = projectPlaneLine({
      ...base,
      transformB: sameA.transform,
      alignment: 'sameDirection',
    })
    const faceA = projectPlaneLine({ ...base, alignment: 'faceToFace' })
    const faceB = projectPlaneLine({
      ...base,
      transformB: sameA.transform,
      alignment: 'faceToFace',
    })
    expect(sameB.ok && faceA.ok && faceB.ok).toBe(true)
    if (!sameB.ok || !faceA.ok || !faceB.ok) return

    const dSameA = mateLineWorldFrame(geo, sameA.transform, lineB)!.direction
    const dSameB = mateLineWorldFrame(geo, sameB.transform, lineB)!.direction
    const dFaceA = mateLineWorldFrame(geo, faceA.transform, lineB)!.direction
    const dFaceB = mateLineWorldFrame(geo, faceB.transform, lineB)!.direction
    expect(dSameA.distanceTo(dSameB)).toBeLessThan(1e-4)
    expect(dFaceA.distanceTo(dFaceB)).toBeLessThan(1e-4)
    expect(dSameA.dot(dFaceA)).toBeCloseTo(-1, 2)
  })
})

describe('projectLinePlane (parallel: line ∥ plane, plane driven)', () => {
  const lineA = { kind: 'line' as const, partId: 'a', vertexA: 0, vertexB: 1 }
  const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0] }

  it('rotates plane so it becomes parallel to line', () => {
    // Płaszczyzna XY, linia wzdłuż Z — startowo prostopadłe
    const result = projectLinePlane({
      lineA,
      planeB,
      geometryA: lineAlongZ(),
      geometryB: planeZ(),
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      offsetMm: 2,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const line = mateLineWorldFrame(lineAlongZ(), defaultProgramPartTransform(), lineA)!
    const plane = matePlaneWorldFrame(planeZ(), result.transform, [0])!
    expect(Math.abs(line.direction.dot(plane.normal))).toBeCloseTo(0, 3)
    expect(
      Math.abs(signedLinePlaneDistance(line.point, line.direction, plane.point, plane.normal)),
    ).toBeCloseTo(2, 2)
  })
})
