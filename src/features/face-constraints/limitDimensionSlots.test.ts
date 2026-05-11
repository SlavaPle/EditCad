import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import type { FaceConstraint } from './model'
import {
  axisToDimensionSlot,
  checkConstraintCanBeAddedByDimensionSlots,
} from './limitDimensionSlots'

function makeAxisGeometry(): BufferGeometry {
  const g = new BufferGeometry()
  // Dwie pary trójkątów dla osi X: [0,1] i [2,3].
  const vertices = new Float32Array([
    0, 0, 0, 0, 1, 0, 0, 0, 1, 10, 0, 0, 10, 1, 0, 10, 0, 1,
    0, 2, 0, 0, 3, 0, 0, 2, 1, 10, 2, 0, 10, 3, 0, 10, 2, 1,
  ])
  g.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  return g
}

describe('limitDimensionSlots', () => {
  it('maps axis to dominant slot', () => {
    expect(axisToDimensionSlot({ x: 9, y: 2, z: 1 })).toBe(0)
    expect(axisToDimensionSlot({ x: 1, y: -7, z: 3 })).toBe(1)
    expect(axisToDimensionSlot({ x: 1, y: 1, z: -5 })).toBe(2)
  })

  it('blocks full-dimension type when constraints already exist', () => {
    const geo = makeAxisGeometry()
    const existing: FaceConstraint[] = [{ id: 'c1', type: 'minmax', facePair: { a: 0, b: 1 }, minMm: 1, maxMm: 5 }]
    const res = checkConstraintCanBeAddedByDimensionSlots({
      geometry: geo,
      modelElements: [],
      existing,
      nextType: 'profil',
    })
    expect(res).toEqual({ ok: false, reason: 'fullConstraintExists' })
  })

  it('blocks directional type when slot is already occupied', () => {
    const geo = makeAxisGeometry()
    const existing: FaceConstraint[] = [{ id: 'c1', type: 'minmax', facePair: { a: 0, b: 1 }, minMm: 1, maxMm: 5 }]
    const res = checkConstraintCanBeAddedByDimensionSlots({
      geometry: geo,
      modelElements: [],
      existing,
      nextType: 'const',
      nextMergedFaces: [2, 3],
    })
    expect(res).toEqual({ ok: false, reason: 'slotAlreadyOccupied' })
  })
})
