import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { captureMateEllipse } from './captureMateEllipse'

function regularPolygonGeometry(n: number, radius: number): BufferGeometry {
  const positions: number[] = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    positions.push(
      0, 0, 0,
      Math.cos(a0) * radius, Math.sin(a0) * radius, 0,
      Math.cos(a1) * radius, Math.sin(a1) * radius, 0,
    )
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geo
}

describe('captureMateEllipse', () => {
  it('captures ellipse ref from polygon rim', () => {
    const geo = regularPolygonGeometry(12, 10)
    const result = captureMateEllipse('part-1', geo, 1, 2)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ellipse.kind).toBe('ellipse')
    expect(result.ellipse.partId).toBe('part-1')
    expect(result.ellipse.vertexIndices.length).toBeGreaterThanOrEqual(5)
  })

  it('fails on invalid edge', () => {
    const geo = regularPolygonGeometry(8, 5)
    expect(captureMateEllipse('p', geo, 0, 0).ok).toBe(false)
  })
})
