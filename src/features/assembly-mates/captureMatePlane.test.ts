import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { captureMatePlane } from './captureMatePlane'

function quadInPlaneZ(z: number, facingUp: boolean): BufferGeometry {
  const geo = new BufferGeometry()
  const positions = facingUp
    ? [
        0, 0, z, 10, 0, z, 10, 10, z, //
        0, 0, z, 10, 10, z, 0, 10, z,
      ]
    : [
        0, 0, z, 10, 10, z, 10, 0, z, //
        0, 0, z, 0, 10, z, 10, 10, z,
      ]
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geo
}

describe('captureMatePlane', () => {
  it('captures coplanar patch from seed triangle', () => {
    const geometry = quadInPlaneZ(0, true)
    const result = captureMatePlane('part-a', geometry, 0)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plane.partId).toBe('part-a')
    expect(result.plane.faceIndices).toEqual([0, 1])
    expect(result.plane.faceIndex).toBe(0)
  })

  it('rejects invalid face index', () => {
    const geometry = quadInPlaneZ(0, true)
    expect(captureMatePlane('part-a', geometry, -1).ok).toBe(false)
  })
})
