import { describe, expect, it } from 'vitest'
import { BufferAttribute, BufferGeometry } from 'three'
import {
  collectTriangleIndicesSharingVertexPair,
  resolveConstraintDependentFaceIndices,
} from './resolveConstraintDependentFaces'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'

function twoTrianglesSharingEdge(): BufferGeometry {
  const g = new BufferGeometry()
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0,
  ])
  g.setAttribute('position', new BufferAttribute(positions, 3))
  g.setIndex([0, 1, 2, 1, 2, 3])
  return g
}

describe('collectTriangleIndicesSharingVertexPair', () => {
  it('returns both triangles meeting on the shared edge', () => {
    const g = twoTrianglesSharingEdge()
    const tris = collectTriangleIndicesSharingVertexPair(g, 1, 2)
    expect(tris.sort((a, b) => a - b)).toEqual([0, 1])
  })
})

describe('resolveConstraintDependentFaceIndices', () => {
  it('merges panel X and Y element pairs', () => {
    const elements: PreparedModelElement[] = [
      { id: 'xa', faceIndices: [0, 1] },
      { id: 'xb', faceIndices: [2] },
      { id: 'ya', faceIndices: [5] },
      { id: 'yb', faceIndices: [7, 8] },
    ]
    const faces = resolveConstraintDependentFaceIndices({
      constraint: {
        id: 'p1',
        type: 'panel',
        facePair: null,
        thicknessMm: 2,
        panelX: { maxMm: 100 },
        panelY: { maxMm: 100 },
        ySameAsX: false,
        panelMeasureMode: 'facePairs',
        panelXElementAId: 'xa',
        panelXElementBId: 'xb',
        panelYElementAId: 'ya',
        panelYElementBId: 'yb',
      },
      geometry: null,
      modelElements: elements,
    })
    expect(new Set(faces)).toEqual(new Set([0, 1, 2, 5, 7, 8]))
  })
})
