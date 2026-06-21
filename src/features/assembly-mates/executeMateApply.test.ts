import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../pre-assembly/programParts/programPartTransform'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import {
  createMateDraftSession,
  mateDraftApply,
  mateDraftSetEntity,
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
  it('sets applyState to applied and movingPartId to entity B part', () => {
    const geometryA = quadInPlaneZ(0, true)
    const geometryB = quadInPlaneZ(10, false)
    const entityA = { partId: 'a', faceIndex: 0, faceIndices: [0, 1] }
    const entityB = { partId: 'b', faceIndex: 0, faceIndices: [0, 1] }

    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', entityA)
    session = mateDraftSetEntity(session, 'entityB', entityB)
    const draft = { ...createEmptyParallelMateDraft(), entityA, entityB, offsetMm: 0 }

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
    const entityA = { partId: 'a', faceIndex: 0, faceIndices: [0, 1] }
    const entityB = { partId: 'b', faceIndex: 0, faceIndices: [0, 1] }
    session = mateDraftSetEntity(session, 'entityA', entityA)
    session = mateDraftSetEntity(session, 'entityB', entityB)
    const applied = mateDraftApply(session, defaultProgramPartTransform())
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    const draft = { ...createEmptyParallelMateDraft(), entityA, entityB, offsetMm: 5, alignment: 'sameDirection' as const }
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
