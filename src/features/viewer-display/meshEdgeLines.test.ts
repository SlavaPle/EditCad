import { BufferAttribute, BufferGeometry } from 'three'
import { describe, expect, it } from 'vitest'
import { buildMeshEdgeLinePositions } from './modelDisplayMode'

describe('buildMeshEdgeLinePositions', () => {
  it('returns null for empty geometry', () => {
    const geo = new BufferGeometry()
    expect(buildMeshEdgeLinePositions(geo)).toBeNull()
  })

  it('builds three edges for a single triangle', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
    )
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    expect(lines!.length).toBe(18)
  })
})
