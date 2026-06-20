import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import {
  createAssemblyFileFromProgram,
  parseAssemblyFile,
  serializeAssemblyFile,
} from '../pre-assembly/assemblyFile/assemblyCodec'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { matePlaneWorldFrame } from './planeWorldFrame'
import {
  applyAssemblyMateConstraints,
  reapplyAllAssemblyMates,
} from './applyAssemblyMateConstraints'
import {
  createMateDraftSession,
  mateDraftSave,
  mateDraftSetPlane,
} from './mateDraft'
import { executeMateApply } from './executeMateApply'
import { createEmptyParallelMateDraft } from './store'

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

function programPart(id: string, positionMm: [number, number, number]): PreAssemblyProgramPart {
  return {
    id,
    ref: `${id}.ecdprt`,
    name: id,
    transform: { positionMm, rotationDeg: [0, 0, 0] },
  }
}

function mateGap(
  geometryA: BufferGeometry,
  partA: PreAssemblyProgramPart,
  geometryB: BufferGeometry,
  partB: PreAssemblyProgramPart,
): number {
  const frameA = matePlaneWorldFrame(geometryA, partA.transform, [0, 1])
  const frameB = matePlaneWorldFrame(geometryB, partB.transform, [0, 1])
  if (!frameA || !frameB) throw new Error('missing frame')
  return frameB.point.clone().sub(frameA.point).dot(frameA.normal)
}

describe('assembly mate workflow', () => {
  const geometryA = quadInPlaneZ(0, true)
  const geometryB = quadInPlaneZ(10, false)
  const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0, 1] }
  const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0, 1] }
  const geometries = { a: geometryA, b: geometryB }

  it('save mate then moving anchor keeps driven part constrained', () => {
    let session = createMateDraftSession()
    session = mateDraftSetPlane(session, 'planeA', planeA)
    session = mateDraftSetPlane(session, 'planeB', planeB)
    const draft = { ...createEmptyParallelMateDraft(), planeA, planeB, offsetMm: 2 }

    const applied = executeMateApply({
      session,
      draft,
      programParts: [programPart('a', [0, 0, 0]), programPart('b', [300, 0, 0])],
      programPartGeometries: geometries,
    })
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    const saveResult = mateDraftSave(applied.nextSession, [])
    expect(saveResult.ok).toBe(true)
    if (!saveResult.ok) return

    let parts = applyAssemblyMateConstraints({
      parts: [programPart('a', [0, 0, 0]), programPart('b', [300, 0, 0])],
      mates: [],
      geometries,
      movedPartId: applied.movingPartId,
      movedTransform: applied.transform,
    })

    parts = applyAssemblyMateConstraints({
      parts,
      mates: saveResult.mates,
      geometries,
      movedPartId: 'a',
      movedTransform: { positionMm: [40, 10, -5], rotationDeg: [0, 0, 30] },
    })

    const partA = parts.find((p) => p.id === 'a')!
    const partB = parts.find((p) => p.id === 'b')!
    expect(mateGap(geometryA, partA, geometryB, partB)).toBeCloseTo(2, 2)
  })

  it('reload from .ecdasm reapplies mates when B transform drifted', () => {
    const mate = {
      id: 'mate-1',
      kind: 'parallel' as const,
      planeA,
      planeB,
      alignment: 'faceToFace' as const,
      offsetMm: 0,
    }
    const file = createAssemblyFileFromProgram(
      [programPart('a', [0, 0, 0]), programPart('b', [0, 0, 0])],
      { id: 'asm-1', name: 'Test', mates: [mate] },
    )
    const parsed = parseAssemblyFile(serializeAssemblyFile(file))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const driftedParts = [
      parsed.file.program[0]!,
      {
        ...parsed.file.program[1]!,
        transform: { positionMm: [999, 0, 0] as [number, number, number], rotationDeg: [0, 0, 0] },
      },
    ]

    const restored = reapplyAllAssemblyMates({
      parts: driftedParts,
      mates: parsed.file.mates ?? [],
      geometries,
    })

    expect(mateGap(geometryA, restored[0]!, geometryB, restored[1]!)).toBeCloseTo(0, 2)
  })
})
