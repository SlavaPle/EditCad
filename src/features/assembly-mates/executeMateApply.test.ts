import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../pre-assembly/programParts/programPartTransform'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import {
  createMateDraftSession,
  mateDraftApply,
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

function part(id: string, positionMm: [number, number, number]): PreAssemblyProgramPart {
  return {
    id,
    ref: `${id}.ecdprt`,
    name: id,
    transform: { positionMm, rotationDeg: [0, 0, 0] },
  }
}

describe('executeMateApply', () => {
  it('sets applyState to applied and movingPartId to plane B part', () => {
    const geometryA = quadInPlaneZ(0, true)
    const geometryB = quadInPlaneZ(10, false)
    const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0, 1] }
    const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0, 1] }

    let session = createMateDraftSession()
    session = mateDraftSetPlane(session, 'planeA', planeA)
    session = mateDraftSetPlane(session, 'planeB', planeB)
    const draft = { ...createEmptyParallelMateDraft(), planeA, planeB, offsetMm: 0 }

    const result = executeMateApply({
      session,
      draft,
      programParts: [part('a', [0, 0, 0]), part('b', [199, 0, 0])],
      programPartGeometries: { a: geometryA, b: geometryB },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.nextSession.applyState).toBe('applied')
    expect(result.nextSession.movingPartId).toBe('b')
    expect(result.movingPartId).toBe('b')
  })

  it('updates preview when already applied', () => {
    let session = createMateDraftSession()
    const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0, 1] }
    const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0, 1] }
    session = mateDraftSetPlane(session, 'planeA', planeA)
    session = mateDraftSetPlane(session, 'planeB', planeB)
    const applied = mateDraftApply(session, defaultProgramPartTransform())
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    const draft = { ...createEmptyParallelMateDraft(), planeA, planeB, offsetMm: 5, alignment: 'sameDirection' as const }
    const result = executeMateApply({
      session: applied.session,
      draft,
      programParts: [part('a', [0, 0, 0]), part('b', [0, 0, 0])],
      programPartGeometries: {
        a: quadInPlaneZ(0, true),
        b: quadInPlaneZ(10, false),
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.nextSession.applyState).toBe('applied')
    expect(result.nextSession.draft.offsetMm).toBe(5)
    expect(result.nextSession.draft.alignment).toBe('sameDirection')
    expect(result.nextSession.revertTransform).toEqual(applied.session.revertTransform)
  })
})
