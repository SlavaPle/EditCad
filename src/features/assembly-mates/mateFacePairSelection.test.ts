import { describe, expect, it } from 'vitest'
import {
  applyMateFaceClick,
  clearMateFacePair,
  createEmptyMateFacePair,
  mateFacePairIsComplete,
  type MateFacePair,
} from './mateFacePairSelection'

const noMod = { shiftKey: false, ctrlKey: false, metaKey: false }
const shift = { shiftKey: true, ctrlKey: false, metaKey: false }
const ctrl = { shiftKey: false, ctrlKey: true, metaKey: false }

function click(
  pair: MateFacePair,
  partId: string,
  seed: number,
  faces: number[],
  modifiers: typeof noMod,
) {
  return applyMateFaceClick({
    pair,
    partId,
    seedFaceIndex: seed,
    faceIndices: faces,
    modifiers,
  })
}

describe('mateFacePairSelection', () => {
  it('plain click replaces with a single face', () => {
    const empty = createEmptyMateFacePair()
    const first = click(empty, 'part-a', 2, [2, 3], noMod)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.pair.first).toEqual({
      partId: 'part-a',
      seedFaceIndex: 2,
      faceIndices: [2, 3],
    })
    expect(first.pair.second).toBeNull()
    expect(mateFacePairIsComplete(first.pair)).toBe(false)

    const replaced = click(first.pair, 'part-b', 0, [0], noMod)
    expect(replaced.ok).toBe(true)
    if (!replaced.ok) return
    expect(replaced.pair.first?.partId).toBe('part-b')
    expect(replaced.pair.second).toBeNull()
  })

  it('plain click after a complete pair starts a new single selection', () => {
    let pair = createEmptyMateFacePair()
    const a = click(pair, 'part-a', 1, [1], noMod)
    expect(a.ok).toBe(true)
    if (!a.ok) return
    pair = a.pair
    const b = click(pair, 'part-b', 4, [4, 5], shift)
    expect(b.ok).toBe(true)
    if (!b.ok) return
    expect(mateFacePairIsComplete(b.pair)).toBe(true)

    const again = click(b.pair, 'part-c', 0, [0], noMod)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.pair.first?.partId).toBe('part-c')
    expect(again.pair.second).toBeNull()
  })

  it('Shift adds a second face on another part', () => {
    const a = click(createEmptyMateFacePair(), 'part-a', 1, [1, 2], noMod)
    expect(a.ok).toBe(true)
    if (!a.ok) return
    const b = click(a.pair, 'part-b', 7, [7], shift)
    expect(b.ok).toBe(true)
    if (!b.ok) return
    expect(b.pair.first?.partId).toBe('part-a')
    expect(b.pair.second).toEqual({
      partId: 'part-b',
      seedFaceIndex: 7,
      faceIndices: [7],
    })
    expect(mateFacePairIsComplete(b.pair)).toBe(true)
  })

  it('Ctrl also adds a second face on another part', () => {
    const a = click(createEmptyMateFacePair(), 'part-a', 0, [0], noMod)
    expect(a.ok).toBe(true)
    if (!a.ok) return
    const b = click(a.pair, 'part-b', 3, [3], ctrl)
    expect(b.ok).toBe(true)
    if (!b.ok) return
    expect(mateFacePairIsComplete(b.pair)).toBe(true)
  })

  it('Shift on the same part is rejected', () => {
    const a = click(createEmptyMateFacePair(), 'part-a', 1, [1], noMod)
    expect(a.ok).toBe(true)
    if (!a.ok) return
    const rejected = click(a.pair, 'part-a', 9, [9], shift)
    expect(rejected.ok).toBe(false)
    if (rejected.ok) return
    expect(rejected.reason).toBe('samePart')
    expect(rejected.pair).toEqual(a.pair)
  })

  it('additive click with empty pair sets first face', () => {
    const result = click(createEmptyMateFacePair(), 'part-a', 2, [2], shift)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pair.first?.partId).toBe('part-a')
    expect(result.pair.second).toBeNull()
  })

  it('clearMateFacePair returns empty pair', () => {
    expect(clearMateFacePair()).toEqual({ first: null, second: null })
  })

  it('sorts faceIndices on apply', () => {
    const result = click(createEmptyMateFacePair(), 'part-a', 5, [5, 1, 3], noMod)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pair.first?.faceIndices).toEqual([1, 3, 5])
  })
})
