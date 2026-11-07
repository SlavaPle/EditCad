import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import type { AssemblyMate } from './model'
import { matePlaneWorldFrame } from './planeWorldFrame'
import { applyAssemblyMateConstraints, reapplyAllAssemblyMates } from './applyAssemblyMateConstraints'
import {
  MATES_CHANGE_MUST_SYNC_PROGRAM_PARTS,
  syncProgramPartsAfterMatesChange,
} from './syncProgramPartsAfterMatesChange'
import type { PhantomTransform } from '../pre-assembly/model'

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
): PreAssemblyProgramPart {
  return {
    id,
    ref: `${id}.ecdprt`,
    name: id,
    transform: { positionMm, rotationDeg: [0, 0, 0] },
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

const mate: AssemblyMate = {
  id: 'm1',
  kind: 'parallel',
  entityA: { partId: 'a', faceIndex: 0, faceIndices: [0, 1] },
  entityB: { partId: 'b', faceIndex: 0, faceIndices: [0, 1] },
  alignment: 'faceToFace',
  offsetMm: 0,
}

describe('syncProgramPartsAfterMatesChange (global rule)', () => {
  const geometryA = quadInPlaneZ(0, true)
  const geometryB = quadInPlaneZ(10, false)
  const geometries = { a: geometryA, b: geometryB }

  it('documents that mates changes must sync program parts', () => {
    expect(MATES_CHANGE_MUST_SYNC_PROGRAM_PARTS).toBe(true)
  })

  it('delegates to reapplyAllAssemblyMates (same result)', () => {
    const parts = [part('a', [0, 0, 0]), part('b', [200, 0, 0])]
    const viaSync = syncProgramPartsAfterMatesChange({ parts, mates: [mate], geometries })
    const viaReapply = reapplyAllAssemblyMates({ parts, mates: [mate], geometries })
    expect(viaSync).toEqual(viaReapply)
  })

  it('on unsuppress immediately restores mate constraint on models', () => {
    const established = applyAssemblyMateConstraints({
      parts: [part('a', [0, 0, 0]), part('b', [200, 0, 0])],
      mates: [mate],
      geometries,
      movedPartId: 'a',
      movedTransform: { positionMm: [40, 0, 0], rotationDeg: [0, 0, 0] },
    })
    expect(
      mateGapMm(
        geometryA,
        established.find((p) => p.id === 'a')!.transform,
        geometryB,
        established.find((p) => p.id === 'b')!.transform,
      ),
    ).toBeCloseTo(0, 2)

    const drifted = established.map((p) =>
      p.id === 'b'
        ? {
            ...p,
            transform: {
              positionMm: [200, 30, 0] as [number, number, number],
              rotationDeg: [0, 0, 0] as [number, number, number],
            },
          }
        : p,
    )
    const whileOff = syncProgramPartsAfterMatesChange({
      parts: drifted,
      mates: [{ ...mate, suppressed: true }],
      geometries,
    })
    expect(whileOff.find((p) => p.id === 'b')?.transform.positionMm).toEqual([200, 30, 0])

    const afterOn = syncProgramPartsAfterMatesChange({
      parts: whileOff,
      mates: [mate],
      geometries,
    })
    expect(
      mateGapMm(
        geometryA,
        afterOn.find((p) => p.id === 'a')!.transform,
        geometryB,
        afterOn.find((p) => p.id === 'b')!.transform,
      ),
    ).toBeCloseTo(0, 2)
  })

  it('on sync with locked B, keeps B fixed and drives free A', () => {
    const parts = [part('a', [0, 0, 0]), part('b', [200, 0, 0])]
    const afterOn = syncProgramPartsAfterMatesChange({
      parts,
      mates: [mate],
      geometries,
      lockedPartIds: new Set(['b']),
    })
    expect(afterOn.find((p) => p.id === 'b')?.transform.positionMm).toEqual([200, 0, 0])
    expect(
      mateGapMm(
        geometryA,
        afterOn.find((p) => p.id === 'a')!.transform,
        geometryB,
        afterOn.find((p) => p.id === 'b')!.transform,
      ),
    ).toBeCloseTo(0, 2)
  })

  it('after delete of one mate, remaining active mates still sync', () => {
    const mate2: AssemblyMate = {
      ...mate,
      id: 'm2',
      offsetMm: 4,
    }
    const parts = [part('a', [0, 0, 0]), part('b', [200, 0, 0])]
    const both = syncProgramPartsAfterMatesChange({
      parts,
      mates: [mate, mate2],
      geometries,
    })
    const afterDeleteFirst = syncProgramPartsAfterMatesChange({
      parts: both,
      mates: [mate2],
      geometries,
    })
    expect(afterDeleteFirst.find((p) => p.id === 'a')).toBeDefined()
    expect(afterDeleteFirst.find((p) => p.id === 'b')).toBeDefined()
  })
})
