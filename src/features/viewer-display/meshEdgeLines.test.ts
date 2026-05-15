import { BufferAttribute, BufferGeometry } from 'three'
import { describe, expect, it } from 'vitest'
import { buildMeshEdgeLinePositions } from './modelDisplayMode'

function segmentCount(lines: Float32Array | null): number {
  return lines === null ? 0 : lines.length / 6
}

describe('buildMeshEdgeLinePositions', () => {
  it('returns null for empty geometry', () => {
    const geo = new BufferGeometry()
    expect(buildMeshEdgeLinePositions(geo)).toBeNull()
  })

  it('returns null when position has no triangles', () => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array([]), 3))
    expect(buildMeshEdgeLinePositions(geo)).toBeNull()
  })

  it('builds three edges for a single triangle', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
    )
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    expect(lines!.length).toBe(18)
  })

  it('omits the shared edge between two coplanar triangles (flat quad)', () => {
    const geo = new BufferGeometry()
    // Dwa trójkąty w płaszczyźnie XY: (0,0)-(1,0)-(0,1) i (1,0)-(1,1)-(0,1); wspólna krawędź (1,0)-(0,1)
    geo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0,
        ]),
        3,
      ),
    )
    geo.setIndex([0, 1, 2, 1, 3, 2])
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    // 4 krawędzie zewnętrzne × 6 współrzędnych
    expect(lines!.length).toBe(24)
    expect(segmentCount(lines)).toBe(4)
  })

  it('omits coplanar interior edge when the second triangle has opposite winding', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0,
        ]),
        3,
      ),
    )
    // Wspólna krawędź 1–2; drugi trójkąt w odwrotnym kierunku obiegu
    geo.setIndex([0, 1, 2, 2, 1, 3])
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    expect(segmentCount(lines)).toBe(4)
  })

  it('welds vertices at duplicate positions and still hides flat triangulation diagonal', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
          1, 1, 0,
          1, 1, 0,
        ]),
        3,
      ),
    )
    geo.setIndex([0, 1, 2, 1, 4, 2])
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    expect(segmentCount(lines)).toBe(4)
  })

  it('shows all creased edges on a closed tetrahedron', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          1, 1, 1,
          1, -1, -1,
          -1, 1, -1,
          -1, -1, 1,
        ]),
        3,
      ),
    )
    geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2])
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    // 6 krawędzi × 6
    expect(lines!.length).toBe(36)
  })

  it('shows the shared edge when two triangles are not coplanar (crease)', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
          1, 1, 0.2,
        ]),
        3,
      ),
    )
    geo.setIndex([0, 1, 2, 1, 3, 2])
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    // 5 krawędzi × 6 — wspólna krawędź 1–2 jako załamanie
    expect(lines!.length).toBe(30)
  })

  it('includes an edge shared by three triangles (non-manifold)', () => {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
          0, 0, 1,
          0, -1, 0,
        ]),
        3,
      ),
    )
    geo.setIndex([0, 1, 2, 0, 1, 3, 0, 1, 4])
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    // 7 unikalnych krawędzi; 0–1 incydentne z 3 ścianami
    expect(segmentCount(lines)).toBe(7)
  })

  it('on a triangulated unit cube shows only 12 silhouette edges (no face diagonals)', () => {
    const geo = new BufferGeometry()
    const p = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
      0, 0, 1,
      1, 0, 1,
      1, 1, 1,
      0, 1, 1,
    ])
    geo.setAttribute('position', new BufferAttribute(p, 3))
    geo.setIndex([
      0, 1, 2,
      0, 2, 3,
      4, 6, 5,
      4, 7, 6,
      0, 5, 1,
      0, 4, 5,
      3, 2, 6,
      3, 6, 7,
      1, 5, 6,
      1, 6, 2,
      0, 3, 7,
      0, 7, 4,
    ])
    const lines = buildMeshEdgeLinePositions(geo)
    expect(lines).not.toBeNull()
    expect(segmentCount(lines)).toBe(12)
  })
})
