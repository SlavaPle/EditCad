import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import {
  ellipseCenterFromVertexChain,
  isLocalPointNearEllipseCenter,
  trySelectEllipseFromEdge,
  trySelectEllipseFromVertex,
  trySelectEllipseNearFace,
} from './edgeEllipseSelection'

/** N-kąt foremny w XY (okrąg przybliżony). */
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

function rectangleGeometry(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        0, 0, 0, 10, 0, 0, 10, 4, 0,
        0, 0, 0, 10, 4, 0, 0, 4, 0,
      ],
      3,
    ),
  )
  return geo
}

function ellipsePolygonGeometry(n: number, rx: number, ry: number): BufferGeometry {
  const positions: number[] = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    positions.push(
      0, 0, 0,
      Math.cos(a0) * rx, Math.sin(a0) * ry, 0,
      Math.cos(a1) * rx, Math.sin(a1) * ry, 0,
    )
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geo
}

/** Półokrąg + średnica (prosta) — łuk nie powinien wciągać średnicy. */
function semicircleWithDiameterGeometry(n: number, radius: number): BufferGeometry {
  const positions: number[] = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI
    const a1 = ((i + 1) / n) * Math.PI
    positions.push(
      0, 0, 0,
      Math.cos(a0) * radius, Math.sin(a0) * radius, 0,
      Math.cos(a1) * radius, Math.sin(a1) * radius, 0,
    )
  }
  // średnica: (-r,0) — (r,0) jako dwa trójkąty płaskiego „dna”
  const r = radius
  positions.push(-r, 0, 0, r, 0, 0, 0, -0.5, 0)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geo
}

describe('trySelectEllipseFromEdge', () => {
  it('selects a near-circle from a regular polygon rim edge', () => {
    const geo = regularPolygonGeometry(16, 20)
    const result = trySelectEllipseFromEdge(geo, 1, 2)
    expect(result).not.toBeNull()
    expect(result!.vertexIndices.length).toBeGreaterThanOrEqual(5)
    expect(result!.isCircle).toBe(true)
    expect(result!.closed).toBe(true)
    expect(result!.radiusA).toBeCloseTo(20, 0)
  })

  it('selects the same circle when seed is a rim vertex (short chords)', () => {
    const geo = regularPolygonGeometry(16, 20)
    const result = trySelectEllipseFromVertex(geo, 1)
    expect(result).not.toBeNull()
    expect(result!.vertexIndices.length).toBeGreaterThanOrEqual(5)
    expect(result!.isCircle).toBe(true)
    expect(result!.closed).toBe(true)
  })

  it('selects a circle from a face hit (hover on wall, not only crease edge)', () => {
    const geo = regularPolygonGeometry(16, 20)
    // face 0 = first fan triangle
    const result = trySelectEllipseNearFace(geo, 0)
    expect(result).not.toBeNull()
    expect(result!.vertexIndices.length).toBeGreaterThanOrEqual(5)
    expect(result!.isCircle).toBe(true)
  })

  it('selects an ellipse from a stretched polygon', () => {
    const geo = ellipsePolygonGeometry(20, 30, 12)
    const result = trySelectEllipseFromEdge(geo, 1, 2)
    expect(result).not.toBeNull()
    expect(result!.vertexIndices.length).toBeGreaterThanOrEqual(5)
    // długa półoś ≈ 30 (fit może zwrócić okrąg opisany — ważne że łańcuch z elipsy istnieje)
    expect(Math.max(result!.radiusA, result!.radiusB)).toBeGreaterThan(20)
  })

  it('accepts a partial arc (open chain) when only part of the rim is smooth', () => {
    const positions: number[] = []
    const n = 10
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI
      const a1 = ((i + 1) / n) * Math.PI
      positions.push(
        0, 0, 0,
        Math.cos(a0) * 15, Math.sin(a0) * 15, 0,
        Math.cos(a1) * 15, Math.sin(a1) * 15, 0,
      )
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
    const result = trySelectEllipseFromEdge(geo, 1, 2)
    expect(result).not.toBeNull()
    expect(result!.vertexIndices.length).toBeGreaterThanOrEqual(5)
  })

  it('rejects a rectangle edge (sharp corners)', () => {
    const geo = rectangleGeometry()
    expect(trySelectEllipseFromEdge(geo, 0, 1)).toBeNull()
  })

  it('rejects a straight diameter seed (does not treat line as arc)', () => {
    const geo = semicircleWithDiameterGeometry(12, 20)
    // krawędź średnicy: wierzchołki (-r,0) i (r,0) — ostatni trójkąt
    const position = geo.getAttribute('position')!
    const count = position.count
    // ostatni trójkąt: [-r,0,0], [r,0,0], [0,-0.5,0]
    const result = trySelectEllipseFromEdge(geo, count - 3, count - 2)
    expect(result).toBeNull()
  })

  it('rejects a purely straight polyline', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          0, 0, 0, 10, 0, 0, 10, 0.2, 0,
          0, 0, 0, 10, 0.2, 0, 0, 0.2, 0,
          10, 0, 0, 20, 0, 0, 20, 0.2, 0,
          10, 0, 0, 20, 0.2, 0, 10, 0.2, 0,
        ],
        3,
      ),
    )
    expect(trySelectEllipseFromEdge(geo, 0, 1)).toBeNull()
  })

  it('stops when segment length jumps (different dependency = other arc / line)', () => {
    // Łuk o stabilnych cięciwach, potem długi odcinek — skok długości = inna zależność
    const r = 15
    const n = 12
    const span = Math.PI * 0.7
    const positions: number[] = []
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * span
      const a1 = ((i + 1) / n) * span
      positions.push(
        0, 0, 0,
        Math.cos(a0) * r, Math.sin(a0) * r, 0,
        Math.cos(a1) * r, Math.sin(a1) * r, 0,
      )
    }
    const aEnd = span
    const ex = Math.cos(aEnd) * r
    const ey = Math.sin(aEnd) * r
    positions.push(ex, ey, 0, ex + 80, ey, 0, ex + 40, ey + 1, 0)
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
    const result = trySelectEllipseFromEdge(geo, 1, 2)
    expect(result).not.toBeNull()
    expect(result!.vertexIndices.length).toBeGreaterThanOrEqual(5)
    const position = geo.getAttribute('position')!
    const farX = ex + 80
    const midX = ex + 40
    for (const vi of result!.vertexIndices) {
      const x = position.getX(vi)
      // długi odcinek / jego środek nie wchodzą do łuku
      expect(Math.abs(x - farX)).toBeGreaterThan(1)
      expect(Math.abs(x - midX)).toBeGreaterThan(1)
    }
  })

  it('ellipseCenterFromVertexChain returns near-origin center for regular polygon', () => {
    const geo = regularPolygonGeometry(20, 5)
    const selected = trySelectEllipseFromEdge(geo, 1, 2)
    expect(selected).not.toBeNull()
    const fitted = ellipseCenterFromVertexChain(geo, selected!.vertexIndices)
    expect(fitted).not.toBeNull()
    expect(fitted!.center[0]).toBeCloseTo(0, 0)
    expect(fitted!.center[1]).toBeCloseTo(0, 0)
    expect(isLocalPointNearEllipseCenter({ x: 0, y: 0, z: 0 }, fitted!)).toBe(true)
    expect(isLocalPointNearEllipseCenter({ x: 5, y: 0, z: 0 }, fitted!)).toBe(false)
  })
})
