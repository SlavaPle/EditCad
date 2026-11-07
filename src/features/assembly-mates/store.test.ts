import { describe, expect, it } from 'vitest'
import type { AssemblyMate } from './model'
import {
  createEmptyParallelMateDraft,
  parallelMateConflictsWithExisting,
  removeAssemblyMate,
  setAssemblyMateSuppressed,
  toggleAssemblyMateSuppressed,
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

  it('allows sharing one plane when the other entity differs', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeA,
      entityB: planeBOtherFace,
    }
    expect(validateParallelMateDraft(draft, [existingMate(planeA, planeB)])).toEqual({ ok: true })
  })

  it('rejects exact duplicate mate even when roles are reversed', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeB,
      entityB: planeA,
    }
    const result = validateParallelMateDraft(draft, [existingMate(planeA, planeB)])
    expect(result).toEqual({ ok: false, reason: 'conflictsWithExisting' })
  })

  it('rejects exact duplicate mate with same slot order', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeA,
      entityB: planeB,
    }
    expect(validateParallelMateDraft(draft, [existingMate(planeA, planeB)])).toEqual({
      ok: false,
      reason: 'conflictsWithExisting',
    })
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

  it('rejects negative offset (use flipped instead)', () => {
    const draft = {
      ...createEmptyParallelMateDraft(),
      entityA: planeA,
      entityB: planeB,
      offsetMm: -3,
    }
    expect(validateParallelMateDraft(draft)).toEqual({ ok: false, reason: 'invalidOffset' })
  })
})

describe('validatePerpendicularMateDraft / angular', () => {
  it('rejects vertex pairs for perpendicular', async () => {
    const { createEmptyPerpendicularMateDraft, validatePerpendicularMateDraft } = await import(
      './store'
    )
    const draft = {
      ...createEmptyPerpendicularMateDraft(),
      entityA: { kind: 'vertex' as const, partId: 'a', vertexIndex: 0 },
      entityB: planeB,
    }
    expect(validatePerpendicularMateDraft(draft)).toEqual({
      ok: false,
      reason: 'unsupportedPair',
    })
  })

  it('rejects invalid angle', async () => {
    const { createEmptyAngularMateDraft, validateAngularMateDraft } = await import('./store')
    const draft = {
      ...createEmptyAngularMateDraft(),
      entityA: planeA,
      entityB: planeB,
      angleDeg: Number.NaN,
    }
    expect(validateAngularMateDraft(draft)).toEqual({ ok: false, reason: 'invalidAngle' })
  })
})

describe('parallelMateConflictsWithExisting', () => {
  it('does not conflict across different part pairs', () => {
    expect(
      parallelMateConflictsWithExisting(planeC, planeB, [existingMate(planeA, planeB)]),
    ).toBe(false)
  })

  it('allows sharing one plane when the other entity differs', () => {
    expect(
      parallelMateConflictsWithExisting(planeA, planeBOtherFace, [existingMate(planeA, planeB)]),
    ).toBe(false)
  })

  it('detects exact duplicate pair', () => {
    expect(
      parallelMateConflictsWithExisting(planeA, planeB, [existingMate(planeA, planeB)]),
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

  it('ignores suppressed mates for conflicts', () => {
    const suppressed = { ...existingMate(planeA, planeB), suppressed: true }
    expect(parallelMateConflictsWithExisting(planeA, planeB, [suppressed])).toBe(false)
  })
})

describe('remove / suppress assembly mates', () => {
  it('removeAssemblyMate drops by id', () => {
    const list = [existingMate(planeA, planeB), existingMate(planeC, planeB)]
    expect(removeAssemblyMate(list, list[0]!.id)).toHaveLength(1)
    expect(removeAssemblyMate(list, 'missing')).toHaveLength(2)
  })

  it('setAssemblyMateSuppressed toggles suppressed flag', () => {
    const mate = existingMate(planeA, planeB)
    const suppressed = setAssemblyMateSuppressed([mate], mate.id, true)
    expect(suppressed[0]?.suppressed).toBe(true)
    const active = setAssemblyMateSuppressed(suppressed, mate.id, false)
    expect(active[0]?.suppressed).toBeUndefined()
  })

  it('toggleAssemblyMateSuppressed flips state', () => {
    const mate = existingMate(planeA, planeB)
    const once = toggleAssemblyMateSuppressed([mate], mate.id)
    expect(once[0]?.suppressed).toBe(true)
    const twice = toggleAssemblyMateSuppressed(once, mate.id)
    expect(twice[0]?.suppressed).toBeUndefined()
  })
})

