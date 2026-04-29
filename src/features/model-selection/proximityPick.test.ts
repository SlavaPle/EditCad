import { describe, expect, it } from 'vitest'
import { BoxGeometry, BufferAttribute, BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from 'three'
import { resolveProximityPick } from './proximityPick'
import { DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER } from './types'

function triangleGeometry(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
): BufferGeometry {
  const g = new BufferGeometry()
  const pos = new Float32Array([ax, ay, az, bx, by, bz, cx, cy, cz])
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setIndex([0, 1, 2])
  g.computeBoundingBox()
  return g
}

describe('resolveProximityPick', () => {
  it('wybiera wierzchołek bliżej rogu niż próg krawędzi', () => {
    const g = triangleGeometry(0, 0, 0, 10, 0, 0, 0, 10, 0)
    const p = new Vector3(0.15, 0.15, 0)
    const r = resolveProximityPick(g, 0, p, DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER)
    expect(r.type).toBe('vertex')
    if (r.type === 'vertex') expect(r.index).toBe(0)
  })

  it('na środku dużego trójkąta wybiera płaszczyznę (komplanarne ściany)', () => {
    const g = triangleGeometry(0, 0, 0, 100, 0, 0, 0, 100, 0)
    const p = new Vector3(33, 33, 0)
    const r = resolveProximityPick(g, 0, p, DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER)
    expect(r.type).toBe('faces')
    if (r.type === 'faces') expect(r.indices).toContain(0)
  })

  it('przy wyłączonym face zwraca none gdy brak wierzchołka i krawędzi w tolerancji', () => {
    const g = triangleGeometry(0, 0, 0, 100, 0, 0, 0, 100, 0)
    const p = new Vector3(33, 33, 0)
    const r = resolveProximityPick(g, 0, p, {
      facePlane: false,
      edgeLine: true,
      vertex: true,
    })
    expect(r.type).toBe('none')
  })

  it('dla płaszczyzny wybiera też daleką przeciwległą ścianę', () => {
    const g = new BoxGeometry(2, 2, 6)
    const r = resolveProximityPick(
      g,
      8,
      new Vector3(0, 0, 0),
      {
        facePlane: true,
        edgeLine: false,
        vertex: false,
      },
    )
    expect(r.type).toBe('faces')
    if (r.type !== 'faces') return
    expect(r.indices).toContain(8)
    expect(r.indices).toHaveLength(2)
    expect(r.probableIndices).toBeDefined()
    expect(r.probableIndices?.length).toBeGreaterThanOrEqual(2)
  })

  it('dla krawędzi zwraca skrajne przeciwległe ściany gdy są równoległe', () => {
    const g = new BoxGeometry(2, 2, 2)
    const r = resolveProximityPick(
      g,
      0,
      new Vector3(1, 1, 0),
      { facePlane: false, edgeLine: true, vertex: false },
    )
    expect(r.type).toBe('edge')
    if (r.type !== 'edge') return
    expect(r.probableFaceIndices).toBeDefined()
    expect((r.probableFaceIndices ?? []).length).toBeGreaterThan(0)
  })

  it('для одиночного треугольника не подбирает 1.1/1.2 при выборе ребра', () => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 2, 0, 0, 0, 2, 0], 3))
    g.setIndex(new Uint16BufferAttribute([0, 1, 2], 1))
    g.computeBoundingBox()
    const r = resolveProximityPick(
      g,
      0,
      new Vector3(1, 0.01, 0),
      { facePlane: false, edgeLine: true, vertex: false },
    )
    expect(r.type).toBe('edge')
    if (r.type !== 'edge') return
    expect(r.probableFaceIndices).toBeUndefined()
  })
})
