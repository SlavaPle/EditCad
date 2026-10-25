import { describe, expect, it } from 'vitest'
import { shouldRestoreWorldUpOnViewCommit } from './shouldRestoreWorldUpOnViewCommit'

describe('shouldRestoreWorldUpOnViewCommit', () => {
  it('is true for OrbitControls-like (getPolarAngle)', () => {
    expect(
      shouldRestoreWorldUpOnViewCommit({
        getPolarAngle: () => 1,
      }),
    ).toBe(true)
  })

  it('is false for Trackball-like (no polar API)', () => {
    expect(
      shouldRestoreWorldUpOnViewCommit({
        staticMoving: true,
        update: () => {},
      }),
    ).toBe(false)
  })

  it('is false for nullish', () => {
    expect(shouldRestoreWorldUpOnViewCommit(null)).toBe(false)
    expect(shouldRestoreWorldUpOnViewCommit(undefined)).toBe(false)
  })
})
