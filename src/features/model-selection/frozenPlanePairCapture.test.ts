import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three'
import { captureFrozenPlanePairFromTriangles } from './frozenPlanePairCapture'

/** Dwa równoległe kwadraty (8 trójkątów), jak w stretchBasicEnvelopeForMergedPair.test. */
function geometryTwoParallelPatches(zSep: number): BufferGeometry {
  const g = new BufferGeometry()
  const z = zSep
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, z, 1, 0, z, 1, 1, z, 0, 1, z,
  ])
  g.setAttribute('position', new Float32BufferAttribute(positions, 3))
  g.setIndex(new Uint16BufferAttribute([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7], 1))
  return g
}

describe('captureFrozenPlanePairFromTriangles', () => {
  it('zwraca dwa elementy dla dwóch przeciwległych łat w zaznaczeniu', () => {
    const geo = geometryTwoParallelPatches(10)
    // Geometria ma 4 trójkąty (0–1 dół, 2–3 góra).
    const r = captureFrozenPlanePairFromTriangles(geo, [0, 1, 2, 3], {
      idPrefix: 'tst',
      slotTag: 'fz1',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.elements).toHaveLength(2)
    expect(r.elementAId).toContain('tst-')
    expect(r.elementAId).toContain('-fz1-a')
    expect(r.elementBId).toContain('-fz1-b')
  })

  it('odrzuca zaznaczenie z jedną łatą (jedna płaszczyzna)', () => {
    const geo = geometryTwoParallelPatches(10)
    const r = captureFrozenPlanePairFromTriangles(geo, [0, 1], {
      idPrefix: 'tst',
      slotTag: 'x',
    })
    expect(r).toEqual({ ok: false, reason: 'needTwoPlanarGroups' })
  })
})
