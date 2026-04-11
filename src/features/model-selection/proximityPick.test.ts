import { describe, expect, it } from 'vitest'
import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
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
})
