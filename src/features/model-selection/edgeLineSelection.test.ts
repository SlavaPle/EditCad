import { describe, it, expect } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three'
import { edgePickToleranceFromGeometry, pickClosestTriangleEdge } from './edgeLineSelection'

describe('edgeLineSelection', () => {
  it('picks the edge closest to the local point on the triangle plane', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([
      0, 0, 0,
      2, 0, 0,
      0, 2, 0,
    ])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2], 1))

    const tol = edgePickToleranceFromGeometry(g, 0.5)
    const p = new Vector3(1, 0.05, 0)
    const edge = pickClosestTriangleEdge(g, 0, p, tol)
    expect(edge).not.toBeNull()
    expect(edge).toEqual({ a: 0, b: 1 })
  })

  it('returns null when the point is too far from every edge', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2], 1))

    const p = new Vector3(0.33, 0.33, 5)
    const edge = pickClosestTriangleEdge(g, 0, p, 0.01)
    expect(edge).toBeNull()
  })
})
