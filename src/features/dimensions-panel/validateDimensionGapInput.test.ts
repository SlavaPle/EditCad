import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { validateDimensionGapInput } from './validateDimensionGapInput'

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

const mergedFourFaces = [0, 1, 2, 3] as const
const pairElements: PreparedModelElement[] = [
  { id: 'ea', faceIndices: [0, 1] },
  { id: 'eb', faceIndices: [2, 3] },
]

const baseParams = {
  geometry: new BufferGeometry(),
  mergedFaces: [0, 1] as const,
  faceConstraints: [] as FaceConstraint[],
  modelElements: [],
}

describe('validateDimensionGapInput', () => {
  it('rejects empty, zero, negative and non-numeric input', () => {
    for (const inputText of ['', '  ', '0', '-2', 'abc']) {
      expect(validateDimensionGapInput({ ...baseParams, inputText })).toEqual({
        ok: false,
        error: 'invalidTarget',
        envelope: null,
      })
    }
  })

  it('accepts positive mm with comma decimal', () => {
    expect(validateDimensionGapInput({ ...baseParams, inputText: '12,5' })).toEqual({
      ok: true,
      mm: 12.5,
      envelope: null,
    })
  })

  it('skips envelope check without geometry or merged faces', () => {
    const constraints: FaceConstraint[] = [{ id: 'm', type: 'min', facePair: { a: 0, b: 1 }, valueMm: 10 }]
    expect(
      validateDimensionGapInput({
        inputText: '5',
        geometry: null,
        mergedFaces: [0, 1],
        faceConstraints: constraints,
        modelElements: [],
      }),
    ).toEqual({ ok: true, mm: 5, envelope: null })

    expect(
      validateDimensionGapInput({
        inputText: '5',
        geometry: baseParams.geometry,
        mergedFaces: null,
        faceConstraints: constraints,
        modelElements: [],
      }),
    ).toEqual({ ok: true, mm: 5, envelope: null })
  })

  it('rejects value below MIN envelope on stretch pair', () => {
    const geometry = geometryTwoParallelPatches(10)
    const constraints: FaceConstraint[] = [
      {
        id: 'min1',
        type: 'min',
        elementAId: 'ea',
        elementBId: 'eb',
        facePair: null,
        valueMm: 20,
      },
    ]
    const r = validateDimensionGapInput({
      inputText: '15',
      geometry,
      mergedFaces: mergedFourFaces,
      faceConstraints: constraints,
      modelElements: pairElements,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBe('belowMin')
    expect(r.envelope).not.toBeNull()
    expect(r.envelope!.lower).toBeGreaterThanOrEqual(20)
  })
})
