import { describe, expect, it } from 'vitest'
import {
  createMateDraftSession,
  mateDraftSetEntity,
} from './mateDraft'
import { initialMatesPickSlot, nextMatesPickFlowStep } from './matesPickFlow'

describe('matesPickFlow', () => {
  it('starts with entityA on empty draft', () => {
    expect(initialMatesPickSlot(createMateDraftSession())).toBe('entityA')
  })

  it('advances to entityB after entityA is set', () => {
    let session = mateDraftSetEntity(createMateDraftSession(), 'entityA', {
      partId: 'a',
      faceIndex: 0,
      faceIndices: [0],
    })
    expect(initialMatesPickSlot(session)).toBe('entityB')
  })

  it('does not auto-pick when apply is locked', () => {
    expect(
      initialMatesPickSlot({
        ...createMateDraftSession(),
        applyState: 'applied',
      }),
    ).toBeNull()
  })

  it('does not auto-pick when both entities are already chosen', () => {
    let session = createMateDraftSession()
    session = mateDraftSetEntity(session, 'entityA', {
      partId: 'a',
      faceIndex: 0,
      faceIndices: [0],
    })
    session = mateDraftSetEntity(session, 'entityB', {
      partId: 'b',
      faceIndex: 0,
      faceIndices: [0],
    })
    expect(initialMatesPickSlot(session)).toBeNull()
  })

  it('next step after entityA pick is entityB', () => {
    expect(nextMatesPickFlowStep('entityA')).toBe('entityB')
  })

  it('next step after entityB pick is apply focus', () => {
    expect(nextMatesPickFlowStep('entityB')).toBe('apply')
  })
})
