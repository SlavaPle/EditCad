import { describe, it, expect } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three'
import { getCoplanarConnectedFaces, getFaceVertices } from './facePlaneSelection'

describe('facePlaneSelection', () => {
  it('returns both triangles of a flat quad as one coplanar region', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2, 0, 2, 3], 1))

    const region = getCoplanarConnectedFaces(g, 0).sort((a, b) => a - b)
    expect(region).toEqual([0, 1])
  })

  it('does not include a triangle on a different plane', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([
      0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
      0, 0, 1, 1, 0, 1, 1, 1, 1,
    ])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2, 0, 2, 3, 4, 5, 6], 1))

    const region = getCoplanarConnectedFaces(g, 0).sort((a, b) => a - b)
    expect(region).toEqual([0, 1])
    expect(getFaceVertices(g)).toHaveLength(3)
  })
})
