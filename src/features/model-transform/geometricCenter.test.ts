import { describe, expect, it } from 'vitest'
import { BufferAttribute, BufferGeometry } from 'three'
import { getGeometryGeometricCenter } from './geometricCenter'

describe('getGeometryGeometricCenter', () => {
  it('returns center of vertex AABB, not origin when min is at zero', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([0, 0, 0, 10, 4, 6]), 3),
    )

    const c = getGeometryGeometricCenter(geo)
    expect(c.x).toBeCloseTo(5)
    expect(c.y).toBeCloseTo(2)
    expect(c.z).toBeCloseTo(3)
  })

  it('ignores stale geometry.boundingBox', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([100, 0, 0, 110, 2, 4]), 3),
    )
    geo.boundingBox = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      isEmpty: () => false,
      getCenter: (target: { x: number; y: number; z: number }) => target.set(0, 0, 0),
    } as never

    const c = getGeometryGeometricCenter(geo)
    expect(c.x).toBeCloseTo(105)
    expect(c.y).toBeCloseTo(1)
    expect(c.z).toBeCloseTo(2)
  })

  it('returns zero for empty geometry', () => {
    const geo = new BufferGeometry()
    const c = getGeometryGeometricCenter(geo)
    expect(c.x).toBe(0)
    expect(c.y).toBe(0)
    expect(c.z).toBe(0)
  })

  it('computes center from all corner vertices of a box', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          0, 0, 0,
          8, 0, 0,
          8, 4, 0,
          0, 4, 0,
          0, 0, 2,
          8, 0, 2,
          8, 4, 2,
          0, 4, 2,
        ]),
        3,
      ),
    )
    const c = getGeometryGeometricCenter(geo)
    expect(c.x).toBeCloseTo(4)
    expect(c.y).toBeCloseTo(2)
    expect(c.z).toBeCloseTo(1)
  })
})
