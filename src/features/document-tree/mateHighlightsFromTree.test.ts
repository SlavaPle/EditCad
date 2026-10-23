import { describe, expect, it } from 'vitest'
import type { AssemblyMate } from '../assembly-mates/model'
import {
  highlightsFromAssemblyMate,
  highlightsFromMateEntities,
  mergeMateEntityHighlights,
} from './mateHighlightsFromTree'

const mate: AssemblyMate = {
  id: 'm1',
  kind: 'parallel',
  entityA: { partId: 'a', faceIndex: 0, faceIndices: [0] },
  entityB: { partId: 'b', faceIndex: 1, faceIndices: [1] },
  alignment: 'faceToFace',
  offsetMm: 2,
}

describe('mateHighlightsFromTree', () => {
  it('builds highlights from entities', () => {
    const h = highlightsFromMateEntities(mate.entityA, mate.entityB)
    expect(h?.entityA).toEqual(mate.entityA)
    expect(h?.entityB).toEqual(mate.entityB)
  })

  it('returns null when both missing', () => {
    expect(highlightsFromMateEntities(null, null)).toBeNull()
  })

  it('builds from mate and merges preferring popup', () => {
    const tree = highlightsFromAssemblyMate(mate)
    const popup = highlightsFromMateEntities(
      { partId: 'x', faceIndex: 9, faceIndices: [9] },
      null,
    )
    expect(mergeMateEntityHighlights(popup, tree)).toBe(popup)
    expect(mergeMateEntityHighlights(null, tree)).toBe(tree)
  })
})
