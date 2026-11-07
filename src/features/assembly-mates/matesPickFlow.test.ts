import { describe, expect, it } from 'vitest'
import {
  createMateDraftSession,
  mateDraftSetEntity,
} from './mateDraft'
import {
  inferMatesReselectSlot,
  initialMatesPickSlot,
  matesPickSlotAfterEntitySet,
  nextMatesPickFlowStep,
} from './matesPickFlow'

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

  it('after redefine of A with B filled — slot stays null', () => {
    expect(
      matesPickSlotAfterEntitySet(
        {
          entityA: { partId: 'a2', faceIndex: 1, faceIndices: [1] },
          entityB: { partId: 'b', faceIndex: 0, faceIndices: [0] },
        },
        'entityA',
      ),
    ).toBeNull()
  })

  it('after first A pick — slot goes to entityB', () => {
    expect(
      matesPickSlotAfterEntitySet(
        {
          entityA: { partId: 'a', faceIndex: 0, faceIndices: [0] },
          entityB: null,
        },
        'entityA',
      ),
    ).toBe('entityB')
  })

  it('infers reselect slot from clicked part', () => {
    expect(
      inferMatesReselectSlot({
        partId: 'b',
        entityAPartId: 'a',
        entityBPartId: 'b',
      }),
    ).toBe('entityB')
    expect(
      inferMatesReselectSlot({
        partId: 'x',
        entityAPartId: 'a',
        entityBPartId: 'b',
      }),
    ).toBeNull()
  })
})
