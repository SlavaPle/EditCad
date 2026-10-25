import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { captureMateCurvedPlane } from './captureMateCurvedPlane'

function cylinderSideGeometry(n: number, radius: number, height: number): BufferGeometry {
  const positions: number[] = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    const x0 = Math.cos(a0) * radius
    const y0 = Math.sin(a0) * radius
    const x1 = Math.cos(a1) * radius
    const y1 = Math.sin(a1) * radius
    positions.push(
      x0, y0, 0, x1, y1, 0, x1, y1, height,
      x0, y0, 0, x1, y1, height, x0, y0, height,
    )
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geo
}

describe('captureMateCurvedPlane', () => {
  it('captures curvedPlane ref from cylinder wall', () => {
    const geo = cylinderSideGeometry(16, 20, 25)
    const result = captureMateCurvedPlane('part-1', geo, 2)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.curvedPlane.kind).toBe('curvedPlane')
    expect(result.curvedPlane.partId).toBe('part-1')
    expect(result.curvedPlane.faceIndices.length).toBeGreaterThanOrEqual(4)
    expect(result.curvedPlane.arcA.vertexIndices.length).toBeGreaterThanOrEqual(5)
    expect(result.curvedPlane.arcB?.vertexIndices.length).toBeGreaterThanOrEqual(5)
  })

  it('rejects invalid seed', () => {
    const geo = cylinderSideGeometry(12, 10, 10)
    expect(captureMateCurvedPlane('p', geo, -1).ok).toBe(false)
  })
})
