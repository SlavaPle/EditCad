import { describe, it, expect } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three'
import { edgePickToleranceFromGeometry } from './edgeLineSelection'
import {
  getIncidentFaceIndicesForEdge,
  isIndexedEdgeACrease,
  pickClosestCreasedTriangleEdge,
} from './edgeCreaseSelection'
import { areFacesCoplanar } from './facePlaneSelection'

describe('edgeCreaseSelection', () => {
  it('treats diagonal on a flat quad as non-crease (two coplanar faces)', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2, 0, 2, 3], 1))

    expect(areFacesCoplanar(g, 0, 1)).toBe(true)
    expect(getIncidentFaceIndicesForEdge(g, 0, 2).length).toBe(2)
    expect(isIndexedEdgeACrease(g, 0, 2)).toBe(false)
    expect(isIndexedEdgeACrease(g, 0, 1)).toBe(true)
  })

  it('picks a creased edge, not the coplanar diagonal', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2, 0, 2, 3], 1))

    const tol = edgePickToleranceFromGeometry(g, 0.5)
    const p = new Vector3(0.05, 0.05, 0)
    const edge = pickClosestCreasedTriangleEdge(g, 0, p, tol)
    expect(edge).not.toBeNull()
    expect(edge).toEqual({ a: 0, b: 1 })
  })

  it('detects crease between perpendicular faces', () => {
    const g = new BufferGeometry()
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ])
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2, 0, 2, 3], 1))

    expect(areFacesCoplanar(g, 0, 1)).toBe(false)
    expect(getIncidentFaceIndicesForEdge(g, 0, 2).length).toBe(2)
    expect(isIndexedEdgeACrease(g, 0, 2)).toBe(true)
  })
})
