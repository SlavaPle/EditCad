import { describe, expect, it } from 'vitest'
import { BufferGeometry } from 'three'
import { runConstraintEvaluationForStretch } from './runConstraintEvaluationForStretch'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'

describe('runConstraintEvaluationForStretch', () => {
  const ctx: StretchConstraintEvalContext = {
    geometryBefore: new BufferGeometry(),
    geometryAfter: new BufferGeometry(),
    mergedFacesForEdit: [0, 1],
    elements: [],
  }

  it('BLOCK zwraca lockedByBlock bez kontekstu geometrii', () => {
    expect(
      runConstraintEvaluationForStretch(ctx, { id: 'b', type: 'block', facePair: null }),
    ).toBe('lockedByBlock')
  })
})
