import { describe, expect, it } from 'vitest'
import { mateKindAvailableForEntities } from './model'

const plane = { partId: 'a', faceIndex: 0, faceIndices: [0] }
const line = { kind: 'line' as const, partId: 'b', vertexA: 0, vertexB: 1 }
const vertex = { kind: 'vertex' as const, partId: 'a', vertexIndex: 0 }

describe('mateKindAvailableForEntities', () => {
  it('allows all kinds when entities are empty or plane/line', () => {
    expect(mateKindAvailableForEntities('parallel', null, null)).toBe(true)
    expect(mateKindAvailableForEntities('perpendicular', null, null)).toBe(true)
    expect(mateKindAvailableForEntities('angular', plane, line)).toBe(true)
    expect(mateKindAvailableForEntities('perpendicular', plane, plane)).toBe(true)
  })

  it('allows only parallel when either entity is a vertex', () => {
    expect(mateKindAvailableForEntities('parallel', vertex, null)).toBe(true)
    expect(mateKindAvailableForEntities('perpendicular', vertex, null)).toBe(false)
    expect(mateKindAvailableForEntities('angular', vertex, line)).toBe(false)
    expect(mateKindAvailableForEntities('perpendicular', plane, vertex)).toBe(false)
    expect(mateKindAvailableForEntities('parallel', vertex, plane)).toBe(true)
  })

  it('allows only parallel when either entity is an ellipse', () => {
    const ellipse = {
      kind: 'ellipse' as const,
      partId: 'a',
      vertexIndices: [0, 1, 2, 3, 4],
      closed: false,
    }
    expect(mateKindAvailableForEntities('parallel', ellipse, plane)).toBe(true)
    expect(mateKindAvailableForEntities('perpendicular', ellipse, plane)).toBe(false)
    expect(mateKindAvailableForEntities('angular', plane, ellipse)).toBe(false)
  })
})
