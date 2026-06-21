import { describe, expect, it } from 'vitest'
import {
  createMateDraftSession,
  mateDraftSetPlane,
} from './mateDraft'
import { initialMatesPickSlot, nextMatesPickFlowStep } from './matesPickFlow'

describe('matesPickFlow', () => {
  it('starts with planeA on empty draft', () => {
    expect(initialMatesPickSlot(createMateDraftSession())).toBe('planeA')
  })

  it('advances to planeB after planeA is set', () => {
    let session = mateDraftSetPlane(createMateDraftSession(), 'planeA', {
      partId: 'a',
      faceIndex: 0,
      faceIndices: [0],
    })
    expect(initialMatesPickSlot(session)).toBe('planeB')
  })

  it('does not auto-pick when apply is locked', () => {
    expect(
      initialMatesPickSlot({
        ...createMateDraftSession(),
        applyState: 'applied',
      }),
    ).toBeNull()
  })

  it('next step after planeA pick is planeB', () => {
    expect(nextMatesPickFlowStep('planeA')).toBe('planeB')
  })

  it('next step after planeB pick is apply focus', () => {
    expect(nextMatesPickFlowStep('planeB')).toBe('apply')
  })
})
