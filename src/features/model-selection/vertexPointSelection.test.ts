import { describe, it, expect } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three'
import { edgePickToleranceFromGeometry } from './edgeLineSelection'
import { pickClosestTriangleVertex } from './vertexPointSelection'

describe('vertexPointSelection', () => {
  it('picks the vertex closest to the local hit point', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([
      0, 0, 0,
      10, 0, 0,
      0, 10, 0,
    ])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2], 1))

    const tol = edgePickToleranceFromGeometry(g, 0.5)
    const p = new Vector3(0.1, 0.1, 0)
    const v = pickClosestTriangleVertex(g, 0, p, tol)
    expect(v).toBe(0)
  })

  it('returns null when all corners are farther than maxDistance', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2], 1))

    const p = new Vector3(0.34, 0.34, 0)
    const v = pickClosestTriangleVertex(g, 0, p, 0.05)
    expect(v).toBeNull()
  })
})
