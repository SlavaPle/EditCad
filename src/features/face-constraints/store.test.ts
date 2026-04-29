import { describe, expect, it } from 'vitest'
import { upsertFaceConstraint, removeFaceConstraint } from './store'
import type { FaceConstraint } from './model'

describe('face constraints store', () => {
  it('adds new constraint', () => {
    const list: FaceConstraint[] = []
    const next: FaceConstraint = { id: 'min-1', type: 'min', facePair: { a: 1, b: 2 }, valueMm: 10 }
    const updated = upsertFaceConstraint(list, next)
    expect(updated).toHaveLength(1)
    expect(updated[0]).toEqual(next)
  })

  it('updates same type and pair', () => {
    const list: FaceConstraint[] = [{ id: 'min-1', type: 'min', facePair: { a: 2, b: 1 }, valueMm: 10 }]
    const next: FaceConstraint = { id: 'min-2', type: 'min', facePair: { a: 1, b: 2 }, valueMm: 20 }
    const updated = upsertFaceConstraint(list, next)
    expect(updated).toHaveLength(1)
    expect(updated[0].id).toBe('min-2')
    if (updated[0].type !== 'min') return
    expect(updated[0].valueMm).toBe(20)
  })

  it('removes by id', () => {
    const list: FaceConstraint[] = [
      { id: 'a', type: 'block', facePair: null },
      { id: 'b', type: 'profil', facePair: { a: 4, b: 8 }, valueMm: 300 },
    ]
    const updated = removeFaceConstraint(list, 'a')
    expect(updated).toHaveLength(1)
    expect(updated[0].id).toBe('b')
  })
})
