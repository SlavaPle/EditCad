import { describe, expect, it } from 'vitest'
import type { AssemblyMate } from './model'
import {
  createEmptyParallelMateDraft,
  parallelMateConflictsWithExisting,
  validateParallelMateDraft,
} from './store'

const planeA = { partId: 'a', faceIndex: 0, faceIndices: [0] }
const planeB = { partId: 'b', faceIndex: 0, faceIndices: [0] }
const planeAOtherFace = { partId: 'a', faceIndex: 2, faceIndices: [4, 5] }
const planeBOtherFace = { partId: 'b', faceIndex: 1, faceIndices: [2, 3] }
const planeC = { partId: 'c', faceIndex: 0, faceIndices: [0] }

const existingMate = (
  anchor: typeof planeA,
  driven: typeof planeB,
): AssemblyMate => ({
  id: `mate-${anchor.partId}-${driven.partId}`,
  kind: 'parallel',
  entityA: anchor,
  entityB: driven,
  alignment: 'faceToFace',
  offsetMm: 0,
})

describe('validateParallelMateDraft', () => {
  it('rejects planes on the same part', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeA,
      entityB: { ...planeA, faceIndex: 1 },
    }
    expect(validateParallelMateDraft(draft)).toEqual({ ok: false, reason: 'samePart' })
  })

  it('allows another mate when only the moving part overlaps on a different pair', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeC,
      entityB: planeB,
    }
    expect(validateParallelMateDraft(draft, [existingMate(planeA, planeB)])).toEqual({ ok: true })
  })

  it('allows another mate on the same pair when different planes are used', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeAOtherFace,
      entityB: planeBOtherFace,
    }
    expect(validateParallelMateDraft(draft, [existingMate(planeA, planeB)])).toEqual({ ok: true })
  })

  it('rejects when the same pair reuses an already constrained plane', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeA,
      entityB: planeBOtherFace,
    }
    const result = validateParallelMateDraft(draft, [existingMate(planeA, planeB)])
    expect(result).toEqual({ ok: false, reason: 'conflictsWithExisting' })
  })

  it('rejects duplicate mate even when roles are reversed', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeB,
      entityB: planeA,
    }
    const result = validateParallelMateDraft(draft, [existingMate(planeA, planeB)])
    expect(result).toEqual({ ok: false, reason: 'conflictsWithExisting' })
  })

  it('accepts a mate between unrelated parts', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeC,
      entityB: { partId: 'd', faceIndex: 0, faceIndices: [0] },
    }
    expect(validateParallelMateDraft(draft, [existingMate(planeA, planeB)])).toEqual({ ok: true })
  })

  it('allows mixed entity kinds on the same pair', () => {
    const vertexA = { kind: 'vertex' as const, partId: 'a', vertexIndex: 0 }
    const planeBRef = { partId: 'b', faceIndex: 0, faceIndices: [0] }
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: vertexA,
      entityB: planeBRef,
    }
    expect(validateParallelMateDraft(draft)).toEqual({ ok: true })
  })
})

describe('parallelMateConflictsWithExisting', () => {
  it('does not conflict across different part pairs', () => {
    expect(
      parallelMateConflictsWithExisting(planeC, planeB, [existingMate(planeA, planeB)]),
    ).toBe(false)
  })

  it('detects overlap on the same pair', () => {
    expect(
      parallelMateConflictsWithExisting(planeA, planeBOtherFace, [existingMate(planeA, planeB)]),
    ).toBe(true)
  })

  it('allows independent planes on the same pair', () => {
    expect(
      parallelMateConflictsWithExisting(
        planeAOtherFace,
        planeBOtherFace,
        [existingMate(planeA, planeB)],
      ),
    ).toBe(false)
  })

  it('allows line mate on same pair with different edges', () => {
    const lineA = { kind: 'line' as const, partId: 'a', vertexA: 0, vertexB: 1 }
    const lineB = { kind: 'line' as const, partId: 'b', vertexA: 2, vertexB: 3 }
    const existing: AssemblyMate = {
      id: 'mate-line',
      kind: 'parallel',
      entityA: { kind: 'line', partId: 'a', vertexA: 4, vertexB: 5 },
      entityB: { kind: 'line', partId: 'b', vertexA: 6, vertexB: 7 },
      alignment: 'faceToFace',
      offsetMm: 0,
    }
    expect(parallelMateConflictsWithExisting(lineA, lineB, [existing])).toBe(false)
  })
})
