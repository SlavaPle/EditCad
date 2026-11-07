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

/** Dwa quady w jednej geometrii (face 0–1 i 2–3) — ten sam normal, różne faceIndices. */
function mergedCoplanarQuads(z: number, facingUp: boolean): BufferGeometry {
  const g1 = quadInPlaneZ(z, facingUp)
  const g2 = quadInPlaneZ(z, facingUp)
  const p1 = g1.getAttribute('position') as import('three').BufferAttribute
  const p2 = g2.getAttribute('position') as import('three').BufferAttribute
  const merged = new Float32Array(p1.count * 3 + p2.count * 3)
  merged.set(p1.array as Float32Array, 0)
  merged.set(p2.array as Float32Array, p1.count * 3)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(merged, 3))
  geo.computeBoundingBox()
  return geo
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
    expect(result.nextSession.draft.kind).toBe('parallel')
    if (result.nextSession.draft.kind !== 'parallel') return
    expect(result.nextSession.draft.offsetMm).toBe(5)
    expect(result.nextSession.draft.alignment).toBe('sameDirection')
    expect(result.nextSession.revertTransform).toEqual(applied.session.revertTransform)
  })

  it('moves unlocked A when B is locked (swap driven role)', () => {
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
      programPartGeometries: {
        a: quadInPlaneZ(0, true),
        b: quadInPlaneZ(10, false),
      },
      lockedPartIds: new Set(['b']),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.movingPartId).toBe('a')
    expect(result.nextSession.movingPartId).toBe('a')
    expect(result.nextSession.draft.entityA?.partId).toBe('b')
    expect(result.nextSession.draft.entityB?.partId).toBe('a')
  })

  it('accepts compatible second parallel mate on same normal', () => {
    const geometryA = mergedCoplanarQuads(0, true)
    const geometryB = mergedCoplanarQuads(10, false)
    const entityA1 = { partId: 'a', faceIndex: 0, faceIndices: [0, 1] }
    const entityB1 = { partId: 'b', faceIndex: 0, faceIndices: [0, 1] }
    const entityA2 = { partId: 'a', faceIndex: 2, faceIndices: [2, 3] }
    const entityB2 = { partId: 'b', faceIndex: 2, faceIndices: [2, 3] }
    const existing = [
      {
        id: 'mate-1',
        kind: 'parallel' as const,
        entityA: entityA1,
        entityB: entityB1,
        alignment: 'faceToFace' as const,
        offsetMm: 0,
      },
    ]
    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', entityA2)
    session = mateDraftSetEntity(session, 'entityB', entityB2)
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: entityA2,
      entityB: entityB2,
      offsetMm: 0,
    }

    const result = executeMateApply({
      session,
      draft,
      existingMates: existing,
      programParts: [part('a', [0, 0, 0]), part('b', [50, 0, 0])],
      programPartGeometries: { a: geometryA, b: geometryB },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.movingPartId).toBe('b')
  })

  it('refuses draft that conflicts with existing parallel mates', () => {
    const geometryA = mergedCoplanarQuads(0, true)
    const geometryB = mergedCoplanarQuads(10, false)
    const entityA1 = { partId: 'a', faceIndex: 0, faceIndices: [0, 1] }
    const entityB1 = { partId: 'b', faceIndex: 0, faceIndices: [0, 1] }
    const entityA2 = { partId: 'a', faceIndex: 2, faceIndices: [2, 3] }
    const entityB2 = { partId: 'b', faceIndex: 2, faceIndices: [2, 3] }
    const existing = [
      {
        id: 'mate-1',
        kind: 'parallel' as const,
        entityA: entityA1,
        entityB: entityB1,
        alignment: 'faceToFace' as const,
        offsetMm: 0,
      },
    ]
    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', entityA2)
    session = mateDraftSetEntity(session, 'entityB', entityB2)
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: entityA2,
      entityB: entityB2,
      offsetMm: 25,
    }

    const result = executeMateApply({
      session,
      draft,
      existingMates: existing,
      programParts: [part('a', [0, 0, 0]), part('b', [0, 0, 0])],
      programPartGeometries: { a: geometryA, b: geometryB },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('inconsistentWithExisting')
  })

  it('refuses when both parts are locked', () => {
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
      programPartGeometries: {
        a: quadInPlaneZ(0, true),
        b: quadInPlaneZ(10, false),
      },
      lockedPartIds: new Set(['a', 'b']),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('partLocked')
  })
})
