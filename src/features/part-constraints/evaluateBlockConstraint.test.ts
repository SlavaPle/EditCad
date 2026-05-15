import { describe, expect, it } from 'vitest'
import { evaluateBlockConstraint } from './evaluateBlockConstraint'

describe('evaluateBlockConstraint', () => {
  it('zawsze zwraca lockedByBlock', () => {
    expect(evaluateBlockConstraint({ id: 'b', type: 'block', facePair: null })).toBe('lockedByBlock')
  })
})
