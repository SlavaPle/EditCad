import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../../pre-assembly/programParts/programPartTransform'
import { matePlaneWorldFrame } from '../planeWorldFrame'
import { angleBetweenDirections } from './orientDirectionsAtAngle'
import { projectOrientPlanePlane } from './projectOrientPlanePlane'

function planeGeo(normalHint: 'z' | 'y'): BufferGeometry {
  const geo = new BufferGeometry()
  if (normalHint === 'z') {
    geo.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 10, 0, 0, 0, 10, 0], 3),
    )
  } else {
    geo.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 10, 0, 0, 0, 0, 10], 3),
    )
  }
  geo.computeBoundingBox()
  return geo
}

describe('projectOrientPlanePlane', () => {
  it('sets normals to 90° for perpendicular', () => {
    const geoA = planeGeo('z')
    const geoB = planeGeo('y')
    const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0] }
    const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0] }
    const transformA = defaultProgramPartTransform()
    const transformB = defaultProgramPartTransform()

    const result = projectOrientPlanePlane({
      planeA,
      planeB,
      geometryA: geoA,
      geometryB: geoB,
      transformA,
      transformB,
      angleRad: Math.PI / 2,
      flipped: false,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = matePlaneWorldFrame(geoA, transformA, [0])!
    const frameB = matePlaneWorldFrame(geoB, result.transform, [0])!
    expect(angleBetweenDirections(frameA.normal, frameB.normal)).toBeCloseTo(Math.PI / 2, 3)
  })

  it('flip keeps 90° magnitude', () => {
    const geoA = planeGeo('z')
    const geoB = planeGeo('y')
    const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0] }
    const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0] }
    const transformA = defaultProgramPartTransform()
    let transformB = {
      ...defaultProgramPartTransform(),
      rotationDeg: [20, 10, 5] as [number, number, number],
    }

    const a = projectOrientPlanePlane({
      planeA,
      planeB,
      geometryA: geoA,
      geometryB: geoB,
      transformA,
      transformB,
      angleRad: Math.PI / 2,
      flipped: false,
    })
    const b = projectOrientPlanePlane({
      planeA,
      planeB,
      geometryA: geoA,
      geometryB: geoB,
      transformA,
      transformB,
      angleRad: Math.PI / 2,
      flipped: true,
    })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return

    const nA = matePlaneWorldFrame(geoA, transformA, [0])!.normal
    const nB0 = matePlaneWorldFrame(geoB, a.transform, [0])!.normal
    const nB1 = matePlaneWorldFrame(geoB, b.transform, [0])!.normal
    expect(angleBetweenDirections(nA, nB0)).toBeCloseTo(Math.PI / 2, 3)
    expect(angleBetweenDirections(nA, nB1)).toBeCloseTo(Math.PI / 2, 3)
    expect(new Vector3().copy(nB0).distanceTo(nB1)).toBeGreaterThan(0.5)
  })
})
