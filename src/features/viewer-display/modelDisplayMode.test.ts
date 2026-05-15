import { describe, expect, it } from 'vitest'
import { isSolidBodyDisplayMode, usesModelEdgeLines } from './modelDisplayMode'

describe('model display mode helpers', () => {
  it('treats solidTextured as solid body without edge lines', () => {
    expect(isSolidBodyDisplayMode('solidTextured')).toBe(true)
    expect(usesModelEdgeLines('solidTextured')).toBe(false)
  })

  it('shows edge lines only for edgesOnly and solidWithEdges', () => {
    expect(usesModelEdgeLines('edgesOnly')).toBe(true)
    expect(usesModelEdgeLines('solidWithEdges')).toBe(true)
    expect(usesModelEdgeLines('solid')).toBe(false)
  })
})
