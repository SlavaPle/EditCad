import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { createEmptyMateFacePair, type MateFacePair } from './mateFacePairSelection'
import { openMateFromFacePair } from './openMateFromFacePair'

function quadInPlaneZ(z: number): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        0, 0, z, 10, 0, z, 10, 10, z, //
        0, 0, z, 10, 10, z, 0, 10, z,
      ],
      3,
    ),
  )
  return geo
}

describe('openMateFromFacePair', () => {
  it('incomplete pair opens type-first with entityA slot', () => {
    const result = openMateFromFacePair({
      pair: createEmptyMateFacePair(),
      geometries: {},
    })
    expect(result.openedFromPair).toBe(false)
    expect(result.pickSlot).toBe('entityA')
    expect(result.session.draft.entityA).toBeNull()
    expect(result.session.draft.entityB).toBeNull()
  })

  it('single face opens type-first', () => {
    const pair: MateFacePair = {
      first: { partId: 'a', seedFaceIndex: 0, faceIndices: [0, 1] },
      second: null,
    }
    const result = openMateFromFacePair({
      pair,
      geometries: { a: quadInPlaneZ(0) },
    })
    expect(result.openedFromPair).toBe(false)
    expect(result.pickSlot).toBe('entityA')
  })

  it('complete pair fills draft entities and clears pick slot', () => {
    const pair: MateFacePair = {
      first: { partId: 'a', seedFaceIndex: 0, faceIndices: [0, 1] },
      second: { partId: 'b', seedFaceIndex: 0, faceIndices: [0, 1] },
    }
    const result = openMateFromFacePair({
      pair,
      geometries: {
        a: quadInPlaneZ(0),
        b: quadInPlaneZ(20),
      },
    })
    expect(result.openedFromPair).toBe(true)
    expect(result.pickSlot).toBeNull()
    expect(result.session.draft.entityA?.partId).toBe('a')
    expect(result.session.draft.entityB?.partId).toBe('b')
    expect(result.session.draft.entityA && 'faceIndices' in result.session.draft.entityA).toBe(
      true,
    )
  })

  it('complete pair with missing geometry falls back to type-first', () => {
    const pair: MateFacePair = {
      first: { partId: 'a', seedFaceIndex: 0, faceIndices: [0] },
      second: { partId: 'b', seedFaceIndex: 0, faceIndices: [0] },
    }
    const result = openMateFromFacePair({
      pair,
      geometries: { a: quadInPlaneZ(0) },
    })
    expect(result.openedFromPair).toBe(false)
    expect(result.pickSlot).toBe('entityA')
  })
})
