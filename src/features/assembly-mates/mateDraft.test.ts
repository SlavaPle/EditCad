import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../pre-assembly/programParts/programPartTransform'
import {
  createMateDraftSession,
  mateDraftApply,
  mateDraftRevert,
  mateDraftSave,
  mateDraftSetEntity,
  mateDraftUpdateDraft,
} from './mateDraft'

const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0] }
const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0] }

describe('mateDraft', () => {
  it('apply → revert restores transform snapshot', () => {
    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', planeA)
    session = mateDraftSetEntity(session, 'entityB', planeB)

    const before = defaultProgramPartTransform()
    const applyResult = mateDraftApply(session, before)
    expect(applyResult.ok).toBe(true)
    if (!applyResult.ok) return

    const revertResult = mateDraftRevert(applyResult.session)
    expect(revertResult.ok).toBe(true)
    if (!revertResult.ok) return
    expect(revertResult.transform).toEqual(before)
    expect(revertResult.session.applyState).toBe('idle')
  })

  it('save resets session and appends mate', () => {
    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', planeA)
    session = mateDraftSetEntity(session, 'entityB', planeB)
    const applied = mateDraftApply(session, defaultProgramPartTransform())
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    const saveResult = mateDraftSave(applied.session, [])
    expect(saveResult.ok).toBe(true)
    if (!saveResult.ok) return
    expect(saveResult.mates).toHaveLength(1)
    expect(saveResult.mate.entityA.partId).toBe('a')
    expect(saveResult.session.draft.entityA).toBeNull()
    expect(saveResult.session.applyState).toBe('idle')
  })

  it('allows alignment and offset edits while preview is applied', () => {
    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', planeA)
    session = mateDraftSetEntity(session, 'entityB', planeB)
    const applied = mateDraftApply(session, defaultProgramPartTransform())
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    const updated = mateDraftUpdateDraft(applied.session, {
      alignment: 'sameDirection',
      offsetMm: 12,
      flipped: true,
    })
    expect(updated.draft.kind).toBe('parallel')
    if (updated.draft.kind !== 'parallel') return
    expect(updated.draft.alignment).toBe('sameDirection')
    expect(updated.draft.offsetMm).toBe(12)
    expect(updated.draft.flipped).toBe(true)
    expect(updated.applyState).toBe('applied')
    expect(updated.revertTransform).toEqual(applied.session.revertTransform)

    const redefined = mateDraftSetEntity(updated, 'entityA', {
      partId: 'c',
      faceIndex: 0,
      faceIndices: [0],
    })
    expect(redefined.applyState).toBe('applied')
    expect(redefined.draft.entityA).toEqual({
      partId: 'c',
      faceIndex: 0,
      faceIndices: [0],
    })
  })

  it('accepts mixed entity kinds in draft', () => {
    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', {
      kind: 'vertex',
      partId: 'a',
      vertexIndex: 0,
    })
    session = mateDraftSetEntity(session, 'entityB', planeB)
    expect(session.draft.entityA).toEqual({ kind: 'vertex', partId: 'a', vertexIndex: 0 })
    expect(session.draft.entityB).toEqual(planeB)
  })

  it('coerces to parallel when vertex is picked on perpendicular', () => {
    let session = createMateDraftSession('perpendicular')
    expect(session.draft.kind).toBe('perpendicular')
    session = mateDraftSetEntity(session, 'entityA', {
      kind: 'vertex',
      partId: 'a',
      vertexIndex: 0,
    })
    expect(session.draft.kind).toBe('parallel')
    expect(session.draft.entityA).toEqual({ kind: 'vertex', partId: 'a', vertexIndex: 0 })
  })

  it('ignores kind change to perpendicular when draft has a vertex', () => {
    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', {
      kind: 'vertex',
      partId: 'a',
      vertexIndex: 0,
    })
    session = mateDraftUpdateDraft(session, { kind: 'perpendicular' })
    expect(session.draft.kind).toBe('parallel')
  })
})

