import { describe, it, expect } from 'vitest'
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three'
import { findFarthestOppositeCoplanarFaces, getCoplanarConnectedFaces, getFaceVertices } from './facePlaneSelection'

function faceCentroid(geometry: BufferGeometry, faceIndex: number): Vector3 {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const base = faceIndex * 3
  const ia = index ? index.getX(base) : base
  const ib = index ? index.getX(base + 1) : base + 1
  const ic = index ? index.getX(base + 2) : base + 2
  return new Vector3(
    (position.getX(ia) + position.getX(ib) + position.getX(ic)) / 3,
    (position.getY(ia) + position.getY(ib) + position.getY(ic)) / 3,
    (position.getZ(ia) + position.getZ(ib) + position.getZ(ic)) / 3,
  )
}

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

  it('finds farthest opposite coplanar patch for planar face on a box', () => {
    const g = new BoxGeometry(2, 2, 6)
    const faceCount = (g.getIndex()?.count ?? 0) / 3
    let maxZFace = 0
    let maxZ = -Infinity
    for (let fi = 0; fi < faceCount; fi++) {
      const c = faceCentroid(g, fi)
      if (c.z > maxZ) {
        maxZ = c.z
        maxZFace = fi
      }
    }

    const opposite = findFarthestOppositeCoplanarFaces(g, maxZFace)
    expect(opposite).toHaveLength(2)
    for (const fi of opposite) {
      expect(faceCentroid(g, fi).z).toBeLessThan(0)
    }
  })
})
