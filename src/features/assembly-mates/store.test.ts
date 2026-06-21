import { describe, expect, it } from 'vitest'
import type { AssemblyMate } from './model'
import {
  createEmptyParallelMateDraft,
  parallelMateConflictsWithExisting,
  validateParallelMateDraft,
} from './store'

const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0] }
const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0] }
const planeC = { partId: 'c', faceIndex: 0, faceIndices: [0] }

const existingMate = (anchorId: string, drivenId: string): AssemblyMate => ({
  id: `mate-${anchorId}-${drivenId}`,
  kind: 'parallel',
  planeA: { partId: anchorId, faceIndex: 0, faceIndices: [0] },
  planeB: { partId: drivenId, faceIndex: 0, faceIndices: [0] },
  alignment: 'faceToFace',
  offsetMm: 0,
})

describe('validateParallelMateDraft', () => {
  it('rejects planes on the same part', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      planeA,
      planeB: { ...planeA, faceIndex: 1 },
    }
    expect(validateParallelMateDraft(draft)).toEqual({ ok: false, reason: 'samePart' })
  })

  it('rejects when the moving part is already constrained', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      planeA: planeC,
      planeB,
    }
    const result = validateParallelMateDraft(draft, [existingMate('a', 'b')])
    expect(result).toEqual({ ok: false, reason: 'conflictsWithExisting' })
  })

  it('rejects duplicate pair even when roles are reversed', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      planeA: planeB,
      planeB: planeA,
    }
    const result = validateParallelMateDraft(draft, [existingMate('a', 'b')])
    expect(result).toEqual({ ok: false, reason: 'conflictsWithExisting' })
  })

  it('accepts a mate between unrelated parts', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      planeA: planeC,
      planeB: { partId: 'd', faceIndex: 0, faceIndices: [0] },
    }
    expect(validateParallelMateDraft(draft, [existingMate('a', 'b')])).toEqual({ ok: true })
  })
})

describe('parallelMateConflictsWithExisting', () => {
  it('detects driven-part conflict', () => {
    expect(
      parallelMateConflictsWithExisting(planeC, planeB, [existingMate('a', 'b')]),
    ).toBe(true)
  })

  it('detects duplicate pair', () => {
    expect(
      parallelMateConflictsWithExisting(planeA, planeB, [existingMate('a', 'b')]),
    ).toBe(true)
  })
})
