import { BufferAttribute, BufferGeometry } from 'three'
import { describe, expect, it } from 'vitest'
import { applyBoxProjectionUvs } from './boxProjectionUv'

describe('applyBoxProjectionUvs', () => {
  it('adds uv attribute for positioned geometry', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]), 3),
    )
    applyBoxProjectionUvs(geo)
    const uv = geo.getAttribute('uv')
    expect(uv).toBeDefined()
    expect(uv!.count).toBe(4)
  })
})
