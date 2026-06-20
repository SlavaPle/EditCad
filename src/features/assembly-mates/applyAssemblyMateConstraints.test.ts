import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { defaultProgramPartTransform } from '../pre-assembly/programParts/programPartTransform'
import type { PhantomTransform } from '../pre-assembly/model'
import { matePlaneWorldFrame } from './planeWorldFrame'
import type { ParallelMate } from './model'
import {
  applyAssemblyMateConstraints,
  filterAssemblyMatesForPartIds,
  reapplyAllAssemblyMates,
} from './applyAssemblyMateConstraints'

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

function part(
  id: string,
  positionMm: [number, number, number],
  rotationDeg: PhantomTransform['rotationDeg'] = [0, 0, 0],
): PreAssemblyProgramPart {
  return {
    id,
    ref: `${id}.ecdprt`,
    name: id,
    transform: { positionMm, rotationDeg },
  }
}

function makeMate(overrides: Partial<ParallelMate> = {}): ParallelMate {
  return {
    id: 'mate-1',
    kind: 'parallel',
    planeA: { partId: 'a', faceIndex: 0, faceIndices: [0, 1] },
    planeB: { partId: 'b', faceIndex: 0, faceIndices: [0, 1] },
    alignment: 'faceToFace',
    offsetMm: 0,
    ...overrides,
  }
}

function mateGapMm(
  geometryA: BufferGeometry,
  transformA: PhantomTransform,
  geometryB: BufferGeometry,
  transformB: PhantomTransform,
): number {
  const frameA = matePlaneWorldFrame(geometryA, transformA, [0, 1])
  const frameB = matePlaneWorldFrame(geometryB, transformB, [0, 1])
  if (!frameA || !frameB) throw new Error('missing frame')
  return frameB.point.clone().sub(frameA.point).dot(frameA.normal)
}

describe('applyAssemblyMateConstraints', () => {
  const geometryA = quadInPlaneZ(0, true)
  const geometryB = quadInPlaneZ(10, false)
  const geometries = { a: geometryA, b: geometryB }
  const mate = makeMate()

  it('with empty mates only updates moved part', () => {
    const parts = [part('a', [0, 0, 0]), part('b', [10, 0, 0])]
    const result = applyAssemblyMateConstraints({
      parts,
      mates: [],
      geometries,
      movedPartId: 'b',
      movedTransform: { positionMm: [77, 0, 0], rotationDeg: [0, 0, 0] },
    })
    expect(result.find((p) => p.id === 'a')?.transform).toEqual(parts[0]!.transform)
    expect(result.find((p) => p.id === 'b')?.transform.positionMm[0]).toBe(77)
  })

  it('moves driven part B when anchor A is translated', () => {
    const result = applyAssemblyMateConstraints({
      parts: [part('a', [0, 0, 0]), part('b', [200, 0, 0])],
      mates: [mate],
      geometries,
      movedPartId: 'a',
      movedTransform: { positionMm: [50, 0, 0], rotationDeg: [0, 0, 0] },
    })

    const partA = result.find((p) => p.id === 'a')!
    const partB = result.find((p) => p.id === 'b')!
    expect(partA.transform.positionMm[0]).toBe(50)
    expect(mateGapMm(geometryA, partA.transform, geometryB, partB.transform)).toBeCloseTo(0, 2)
  })

  it('preserves saved offset when anchor A moves', () => {
    const offsetMate = makeMate({ offsetMm: 4 })
    const anchored = applyAssemblyMateConstraints({
      parts: [part('a', [0, 0, 0]), part('b', [0, 0, 0])],
      mates: [offsetMate],
      geometries,
      movedPartId: 'a',
      movedTransform: defaultProgramPartTransform(),
    })

    const moved = applyAssemblyMateConstraints({
      parts: anchored,
      mates: [offsetMate],
      geometries,
      movedPartId: 'a',
      movedTransform: { positionMm: [30, -5, 12], rotationDeg: [0, 0, 0] },
    })

    const partA = moved.find((p) => p.id === 'a')!
    const partB = moved.find((p) => p.id === 'b')!
    expect(mateGapMm(geometryA, partA.transform, geometryB, partB.transform)).toBeCloseTo(4, 2)
  })

  it('moves driven B when anchor A rotates', () => {
    const anchored = applyAssemblyMateConstraints({
      parts: [part('a', [0, 0, 0]), part('b', [100, 0, 0])],
      mates: [mate],
      geometries,
      movedPartId: 'a',
      movedTransform: defaultProgramPartTransform(),
    })
    const bBefore = anchored.find((p) => p.id === 'b')!.transform

    const rotated = applyAssemblyMateConstraints({
      parts: anchored,
      mates: [mate],
      geometries,
      movedPartId: 'a',
      movedTransform: { positionMm: [0, 0, 0], rotationDeg: [30, 0, 0] },
    })

    const partA = rotated.find((p) => p.id === 'a')!
    const partB = rotated.find((p) => p.id === 'b')!
    expect(partA.transform.rotationDeg[0]).toBe(30)
    expect(partB.transform).not.toEqual(bBefore)
    expect(mateGapMm(geometryA, partA.transform, geometryB, partB.transform)).toBeCloseTo(0, 2)
  })

  it('snaps driven part B back to mate when B is dragged', () => {
    const anchored = applyAssemblyMateConstraints({
      parts: [part('a', [0, 0, 0]), part('b', [0, 0, 0])],
      mates: [mate],
      geometries,
      movedPartId: 'a',
      movedTransform: defaultProgramPartTransform(),
    })
    const bBefore = anchored.find((p) => p.id === 'b')!.transform

    const after = applyAssemblyMateConstraints({
      parts: anchored,
      mates: [mate],
      geometries,
      movedPartId: 'b',
      movedTransform: {
        positionMm: [bBefore.positionMm[0] + 80, 40, 15],
        rotationDeg: [10, 5, 0],
      },
    })

    const partA = after.find((p) => p.id === 'a')!
    const partB = after.find((p) => p.id === 'b')!
    expect(partA.transform).toEqual(anchored[0]!.transform)
    const frameA = matePlaneWorldFrame(geometryA, partA.transform, [0, 1])
    const frameB = matePlaneWorldFrame(geometryB, partB.transform, [0, 1])
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(frameB.normal.dot(frameA.normal)).toBeCloseTo(-1, 2)
    expect(mateGapMm(geometryA, partA.transform, geometryB, partB.transform)).toBeCloseTo(0, 2)
  })

  it('maintains sameDirection alignment after B drag', () => {
    const sameDirMate = makeMate({ alignment: 'sameDirection' })
    const anchored = applyAssemblyMateConstraints({
      parts: [part('a', [0, 0, 0]), part('b', [0, 0, 0])],
      mates: [sameDirMate],
      geometries,
      movedPartId: 'a',
      movedTransform: defaultProgramPartTransform(),
    })

    const after = applyAssemblyMateConstraints({
      parts: anchored,
      mates: [sameDirMate],
      geometries,
      movedPartId: 'b',
      movedTransform: { positionMm: [50, 50, 50], rotationDeg: [20, 0, 0] },
    })

    const partA = after.find((p) => p.id === 'a')!
    const partB = after.find((p) => p.id === 'b')!
    const frameA = matePlaneWorldFrame(geometryA, partA.transform, [0, 1])
    const frameB = matePlaneWorldFrame(geometryB, partB.transform, [0, 1])
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(frameB.normal.dot(frameA.normal)).toBeCloseTo(1, 2)
  })

  it('ignores mates that do not involve moved part', () => {
    const parts = [part('a', [0, 0, 0]), part('b', [0, 0, 0]), part('c', [5, 0, 0])]
    const result = applyAssemblyMateConstraints({
      parts,
      mates: [mate],
      geometries: { ...geometries, c: geometryA },
      movedPartId: 'c',
      movedTransform: { positionMm: [99, 0, 0], rotationDeg: [0, 0, 0] },
    })
    expect(result.find((p) => p.id === 'c')?.transform.positionMm[0]).toBe(99)
    expect(result.find((p) => p.id === 'b')?.transform).toEqual(parts[1]!.transform)
  })

  it('skips mate when geometry is missing', () => {
    const parts = [part('a', [0, 0, 0]), part('b', [0, 0, 0])]
    const result = applyAssemblyMateConstraints({
      parts,
      mates: [mate],
      geometries: { a: geometryA },
      movedPartId: 'a',
      movedTransform: { positionMm: [12, 0, 0], rotationDeg: [0, 0, 0] },
    })
    expect(result.find((p) => p.id === 'a')?.transform.positionMm[0]).toBe(12)
    expect(result.find((p) => p.id === 'b')?.transform).toEqual(parts[1]!.transform)
  })
})

describe('reapplyAllAssemblyMates', () => {
  const geometryA = quadInPlaneZ(0, true)
  const geometryB = quadInPlaneZ(10, false)
  const geometryC = quadInPlaneZ(0, true)
  const geometryD = quadInPlaneZ(10, false)

  it('returns unchanged parts when mates list is empty', () => {
    const parts = [part('a', [0, 0, 0]), part('b', [500, 0, 0])]
    expect(
      reapplyAllAssemblyMates({
        parts,
        mates: [],
        geometries: { a: geometryA, b: geometryB },
      }),
    ).toEqual(parts)
  })

  it('restores mate from anchor transform on load', () => {
    const result = reapplyAllAssemblyMates({
      parts: [part('a', [0, 0, 0]), part('b', [500, 0, 0])],
      mates: [makeMate()],
      geometries: { a: geometryA, b: geometryB },
    })
    expect(mateGapMm(geometryA, result[0]!.transform, geometryB, result[1]!.transform)).toBeCloseTo(
      0,
      2,
    )
  })

  it('reapplies each saved mate independently', () => {
    const mateAb = makeMate({ id: 'mate-ab' })
    const mateCd = makeMate({
      id: 'mate-cd',
      planeA: { partId: 'c', faceIndex: 0, faceIndices: [0, 1] },
      planeB: { partId: 'd', faceIndex: 0, faceIndices: [0, 1] },
    })
    const result = reapplyAllAssemblyMates({
      parts: [
        part('a', [0, 0, 0]),
        part('b', [400, 0, 0]),
        part('c', [0, 50, 0]),
        part('d', [400, 50, 0]),
      ],
      mates: [mateAb, mateCd],
      geometries: { a: geometryA, b: geometryB, c: geometryC, d: geometryD },
    })

    expect(mateGapMm(geometryA, result[0]!.transform, geometryB, result[1]!.transform)).toBeCloseTo(
      0,
      2,
    )
    expect(mateGapMm(geometryC, result[2]!.transform, geometryD, result[3]!.transform)).toBeCloseTo(
      0,
      2,
    )
  })
})

describe('filterAssemblyMatesForPartIds', () => {
  it('drops mates referencing removed parts', () => {
    expect(filterAssemblyMatesForPartIds([makeMate()], new Set(['a']))).toEqual([])
  })

  it('keeps mate when both parts still exist', () => {
    const mate = makeMate()
    expect(filterAssemblyMatesForPartIds([mate], new Set(['a', 'b']))).toEqual([mate])
  })

  it('drops mate when only driven part remains', () => {
    expect(filterAssemblyMatesForPartIds([makeMate()], new Set(['b']))).toEqual([])
  })
})
