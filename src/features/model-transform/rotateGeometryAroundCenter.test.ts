import { describe, expect, it } from 'vitest'
import { BufferAttribute, BufferGeometry } from 'three'
import { getGeometryGeometricCenter } from './geometricCenter'
import {
  parseRotationDegrees,
  rotateGeometryAroundCenter,
} from './rotateGeometryAroundCenter'

function boxGeometry(min: [number, number, number], max: [number, number, number]): BufferGeometry {
  const geo = new BufferGeometry()
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  const positions = new Float32Array([
    x0, y0, z0,
    x1, y0, z0,
    x1, y1, z0,
    x0, y1, z0,
    x0, y0, z1,
    x1, y0, z1,
    x1, y1, z1,
    x0, y1, z1,
  ])
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.computeBoundingBox()
  return geo
}

function vertexAt(geo: BufferGeometry, index: number): [number, number, number] {
  const pos = geo.getAttribute('position')
  return [pos.getX(index), pos.getY(index), pos.getZ(index)]
}

describe('parseRotationDegrees', () => {
  it('parses comma decimals and empty as zero', () => {
    expect(parseRotationDegrees('')).toBe(0)
    expect(parseRotationDegrees('12,5')).toBe(12.5)
    expect(parseRotationDegrees('-90')).toBe(-90)
  })

  it('returns null for invalid input', () => {
    expect(parseRotationDegrees('abc')).toBeNull()
  })
})

describe('getGeometryGeometricCenter', () => {
  it('returns AABB center', () => {
    const geo = boxGeometry([0, 0, 0], [4, 2, 6])
    const c = getGeometryGeometricCenter(geo)
    expect(c.x).toBeCloseTo(2)
    expect(c.y).toBeCloseTo(1)
    expect(c.z).toBeCloseTo(3)
  })
})

describe('rotateGeometryAroundCenter', () => {
  it('rotates 90° around X about geometric center, not world origin', () => {
    const geo = boxGeometry([0, 0, 0], [2, 2, 2])
    const cornerIndex = 1

    rotateGeometryAroundCenter(geo, { x: 90, y: 0, z: 0 })

    const [x, y, z] = vertexAt(geo, cornerIndex)
    expect(x).toBeCloseTo(2, 4)
    expect(y).toBeCloseTo(2, 4)
    expect(z).toBeCloseTo(0, 4)
  })

  it('keeps geometric center fixed after rotation', () => {
    const geo = boxGeometry([1, 2, 3], [5, 8, 11])
    const centerBefore = getGeometryGeometricCenter(geo).clone()
    rotateGeometryAroundCenter(geo, { x: 15, y: -30, z: 45 })
    const centerAfter = getGeometryGeometricCenter(geo)
    expect(centerAfter.distanceTo(centerBefore)).toBeLessThan(1e-5)
  })
})
