import { BufferAttribute, BufferGeometry } from 'three'
import { describe, expect, it } from 'vitest'
import { computeTriplanarMappingUniforms } from './triplanarMapping'

describe('computeTriplanarMappingUniforms', () => {
  it('maps unit box corners to 0..1 range', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          0, 0, 0, 2, 0, 0, 0, 3, 0, 2, 3, 0, 0, 0, 4, 2, 3, 4,
        ]),
        3,
      ),
    )
    const { origin, invSize } = computeTriplanarMappingUniforms(geo)
    expect(origin.x).toBe(0)
    expect(origin.y).toBe(0)
    expect(origin.z).toBe(0)
    expect(invSize.x).toBeCloseTo(0.5)
    expect(invSize.y).toBeCloseTo(1 / 3)
    expect(invSize.z).toBeCloseTo(0.25)
  })
})
