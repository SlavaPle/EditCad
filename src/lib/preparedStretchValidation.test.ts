import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { validatePreparedStretchPrecheck } from './preparedStretchValidation'

function makeStretchableBox(): BufferGeometry {
  const g = new BufferGeometry()
  const vertices = new Float32Array([
    0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0, 10, 0,
    0, 0, 5, 10, 0, 5, 10, 10, 5, 0, 0, 5, 10, 10, 5, 0, 10, 5,
  ])
  g.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  return g
}

describe('validatePreparedStretchPrecheck', () => {
  it('rejects stretch when BLOCK is present even if limits are unlocked', () => {
    const model = new BufferGeometry()
    const result = validatePreparedStretchPrecheck({
      model,
      mergedFaces: [0, 1],
      targetMm: 10,
      prepared: {
        mode: 'fixed',
        faceConstraints: [{ id: 'b1', type: 'block', facePair: null }],
        modelElements: [],
      },
      constraintsLocked: false,
    })
    expect(result).toEqual({ ok: false, error: 'lockedByBlock' })
  })

  it('rejects stretch when BLOCK is present and limits are locked', () => {
    const model = new BufferGeometry()
    const result = validatePreparedStretchPrecheck({
      model,
      mergedFaces: [0, 1],
      targetMm: 10,
      prepared: {
        mode: 'fixed',
        faceConstraints: [{ id: 'b1', type: 'block', facePair: null }],
        modelElements: [],
      },
      constraintsLocked: true,
    })
    expect(result).toEqual({ ok: false, error: 'lockedByBlock' })
  })

  it('skips constraint evaluation when unlocked and no BLOCK', () => {
    const model = makeStretchableBox()
    const result = validatePreparedStretchPrecheck({
      model,
      mergedFaces: [0, 1, 2, 3],
      targetMm: 12,
      prepared: {
        mode: 'fixed',
        faceConstraints: [
          { id: 'mm', type: 'minmax', facePair: { a: 0, b: 1 }, minMm: 1, maxMm: 100 },
        ],
        modelElements: [],
      },
      constraintsLocked: false,
    })
    expect(result).toEqual({ ok: true })
  })
})