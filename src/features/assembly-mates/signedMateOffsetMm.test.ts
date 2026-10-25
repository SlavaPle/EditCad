import { describe, expect, it } from 'vitest'
import { normalizeParallelMate, signedMateOffsetMm } from './model'

describe('signedMateOffsetMm', () => {
  it('applies flip as negative side', () => {
    expect(signedMateOffsetMm(5, false)).toBe(5)
    expect(signedMateOffsetMm(5, true)).toBe(-5)
    expect(signedMateOffsetMm(5, undefined)).toBe(5)
  })
})

describe('normalizeParallelMate flipped migration', () => {
  it('converts legacy negative offset to abs + flipped', () => {
    const normalized = normalizeParallelMate({
      id: 'm1',
      kind: 'parallel',
      entityA: { partId: 'a', faceIndex: 0, faceIndices: [0] },
      entityB: { partId: 'b', faceIndex: 0, faceIndices: [0] },
      alignment: 'faceToFace',
      offsetMm: -4,
    })
    expect(normalized.offsetMm).toBe(4)
    expect(normalized.flipped).toBe(true)
  })

  it('keeps flipped false for non-negative offset', () => {
    const normalized = normalizeParallelMate({
      id: 'm1',
      kind: 'parallel',
      entityA: { partId: 'a', faceIndex: 0, faceIndices: [0] },
      entityB: { partId: 'b', faceIndex: 0, faceIndices: [0] },
      alignment: 'faceToFace',
      offsetMm: 2,
    })
    expect(normalized.offsetMm).toBe(2)
    expect(normalized.flipped).toBeUndefined()
  })
})
