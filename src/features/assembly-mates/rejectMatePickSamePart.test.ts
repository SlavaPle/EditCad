import { describe, expect, it } from 'vitest'
import { createEmptyParallelMateDraft } from './store'
import { matePickExcludedPartId, rejectMatePickSamePart } from './rejectMatePickSamePart'

describe('rejectMatePickSamePart', () => {
  it('rejects second pick on the same part', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: { partId: 'a', faceIndex: 0, faceIndices: [0] },
    }
    expect(
      rejectMatePickSamePart(draft, 'entityB', {
        partId: 'a',
        faceIndex: 1,
        faceIndices: [1],
      }),
    ).toBe('samePart')
  })

  it('allows pick on a different part', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: { partId: 'a', faceIndex: 0, faceIndices: [0] },
    }
    expect(
      rejectMatePickSamePart(draft, 'entityB', {
        partId: 'b',
        faceIndex: 0,
        faceIndices: [0],
      }),
    ).toBeNull()
  })
})

describe('matePickExcludedPartId', () => {
  it('excludes the other slot part while picking', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: { partId: 'a', faceIndex: 0, faceIndices: [0] },
    }
    expect(matePickExcludedPartId(draft, 'entityB')).toBe('a')
    expect(matePickExcludedPartId(draft, 'entityA')).toBeNull()
    expect(matePickExcludedPartId(draft, null)).toBeNull()
  })
})
