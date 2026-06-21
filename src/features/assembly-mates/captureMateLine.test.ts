import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { captureMateLine } from './captureMateLine'

function segmentAlongX(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, 0, 10, 0, 0, 0, 1, 0], 3),
  )
  return geo
}

describe('captureMateLine', () => {
  it('normalizes vertex order', () => {
    const result = captureMateLine('part-a', segmentAlongX(), 1, 0)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.line).toEqual({
      kind: 'line',
      partId: 'part-a',
      vertexA: 0,
      vertexB: 1,
    })
  })

  it('rejects degenerate edges', () => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute([1, 2, 3, 1, 2, 3], 3))
    expect(captureMateLine('part-a', geo, 0, 1)).toEqual({ ok: false, reason: 'degenerateLine' })
  })
})
