import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../pre-assembly/programParts/programPartTransform'
import {
  createMateDraftSession,
  mateDraftApply,
  mateDraftRevert,
  mateDraftSave,
  mateDraftSetPlane,
} from './mateDraft'

const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0] }
const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0] }

describe('mateDraft', () => {
  it('apply → revert restores transform snapshot', () => {
    let session = createMateDraftSession()
    session = mateDraftSetPlane(session, 'planeA', planeA)
    session = mateDraftSetPlane(session, 'planeB', planeB)

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
    session = mateDraftSetPlane(session, 'planeA', planeA)
    session = mateDraftSetPlane(session, 'planeB', planeB)
    const applied = mateDraftApply(session, defaultProgramPartTransform())
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    const saveResult = mateDraftSave(applied.session, [])
    expect(saveResult.ok).toBe(true)
    if (!saveResult.ok) return
    expect(saveResult.mates).toHaveLength(1)
    expect(saveResult.mate.planeA.partId).toBe('a')
    expect(saveResult.session.draft.planeA).toBeNull()
    expect(saveResult.session.applyState).toBe('idle')
  })
})
