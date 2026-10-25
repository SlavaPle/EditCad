import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { trySelectCurvedPlaneFromFace } from './curvedPlaneSelection'

/** Boczna ściana walca (pas trójkątów między dwoma okręgami). */
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

/** Walec z pokrywami: najpierw bok (2n tris), potem denko z=0 i z=h (po n tris). */
function cylinderWithCapsGeometry(n: number, radius: number, height: number): {
  geo: BufferGeometry
  sideFaceCount: number
  bottomCapSeed: number
} {
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
  const sideFaceCount = 2 * n
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    positions.push(
      0, 0, 0,
      Math.cos(a1) * radius, Math.sin(a1) * radius, 0,
      Math.cos(a0) * radius, Math.sin(a0) * radius, 0,
    )
  }
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    positions.push(
      0, 0, height,
      Math.cos(a0) * radius, Math.sin(a0) * radius, height,
      Math.cos(a1) * radius, Math.sin(a1) * radius, height,
    )
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return { geo, sideFaceCount, bottomCapSeed: sideFaceCount }
}

/** Boczna ściana stożka: baza okrąg + wierzchołek. */
function coneSideGeometry(n: number, radius: number, height: number): BufferGeometry {
  const positions: number[] = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    positions.push(
      0, 0, height,
      Math.cos(a0) * radius, Math.sin(a0) * radius, 0,
      Math.cos(a1) * radius, Math.sin(a1) * radius, 0,
    )
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geo
}

function flatRectangleGeometry(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        0, 0, 0, 20, 0, 0, 20, 10, 0,
        0, 0, 0, 20, 10, 0, 0, 10, 0,
      ],
      3,
    ),
  )
  return geo
}

describe('trySelectCurvedPlaneFromFace', () => {
  it('selects cylinder wall between two circular rims', () => {
    const geo = cylinderSideGeometry(16, 20, 30)
    const result = trySelectCurvedPlaneFromFace(geo, 0)
    expect(result).not.toBeNull()
    expect(result!.faceIndices.length).toBeGreaterThanOrEqual(4)
    expect(result!.arcA.vertexIndices.length).toBeGreaterThanOrEqual(5)
    expect(result!.arcB?.vertexIndices.length).toBeGreaterThanOrEqual(5)
    expect(result!.apexVertexIndex).toBeUndefined()
  })

  it('selects cone wall as arc + apex vertex', () => {
    const geo = coneSideGeometry(16, 20, 40)
    const result = trySelectCurvedPlaneFromFace(geo, 0)
    expect(result).not.toBeNull()
    expect(result!.arcA.vertexIndices.length).toBeGreaterThanOrEqual(5)
    expect(result!.arcB).toBeUndefined()
    expect(typeof result!.apexVertexIndex).toBe('number')
    // Apex at (0,0,40) — indeks 0 w każdym trójkącie non-indexed
    const pos = geo.getAttribute('position')
    const apex = result!.apexVertexIndex!
    expect(pos.getX(apex)).toBeCloseTo(0, 5)
    expect(pos.getY(apex)).toBeCloseTo(0, 5)
    expect(pos.getZ(apex)).toBeCloseTo(40, 5)
  })

  it('rejects a flat planar patch', () => {
    const geo = flatRectangleGeometry()
    expect(trySelectCurvedPlaneFromFace(geo, 0)).toBeNull()
  })

  it('from flat cap jumps to adjacent cylinder wall', () => {
    const { geo, bottomCapSeed } = cylinderWithCapsGeometry(16, 20, 30)
    const result = trySelectCurvedPlaneFromFace(geo, bottomCapSeed)
    expect(result).not.toBeNull()
    expect(result!.faceIndices.length).toBeGreaterThanOrEqual(4)
    expect(result!.arcA.vertexIndices.length).toBeGreaterThanOrEqual(5)
    expect(result!.arcB?.vertexIndices.length).toBeGreaterThanOrEqual(5)
  })

  it('picks equal-length rim arcs for a partial cylinder sector', () => {
    // 1/4 obwodu — dwie otwarte krawędzie o tej samej długości łuku
    const n = 16
    const sector = 4
    const radius = 20
    const height = 30
    const positions: number[] = []
    for (let i = 0; i < sector; i++) {
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
    const result = trySelectCurvedPlaneFromFace(geo, 0)
    expect(result).not.toBeNull()
    expect(result!.arcB).toBeDefined()
    const lenA = result!.arcA.vertexIndices.length
    const lenB = result!.arcB!.vertexIndices.length
    expect(Math.abs(lenA - lenB)).toBeLessThanOrEqual(2)
    expect(result!.faceIndices.length).toBe(sector * 2)
  })
})
