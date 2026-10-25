import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { captureMateEllipseCenterAtLocalPoint } from './captureMateEllipseCenter'

function regularPolygonGeometry(n: number, radius: number): BufferGeometry {
  const positions: number[] = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    positions.push(
      0,
      0,
      0,
      Math.cos(a0) * radius,
      Math.sin(a0) * radius,
      0,
      Math.cos(a1) * radius,
      Math.sin(a1) * radius,
      0,
    )
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geo
}

describe('captureMateEllipseCenterAtLocalPoint', () => {
  it('captures center when click is near fitted center', () => {
    const geo = regularPolygonGeometry(16, 10)
    // Rim edge between first two rim vertices (indices 1 and 2 of first triangle)
    const result = captureMateEllipseCenterAtLocalPoint(
      'p1',
      geo,
      { x: 0.2, y: 0.1, z: 0 },
      { type: 'edge', a: 1, b: 2 },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.center.kind).toBe('ellipseCenter')
    expect(result.center.partId).toBe('p1')
    expect(result.center.vertexIndices.length).toBeGreaterThanOrEqual(5)
  })

  it('rejects when click is on the rim (not near center)', () => {
    const geo = regularPolygonGeometry(16, 10)
    const result = captureMateEllipseCenterAtLocalPoint(
      'p1',
      geo,
      { x: 10, y: 0, z: 0 },
      { type: 'edge', a: 1, b: 2 },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('notNearCenter')
  })
})
