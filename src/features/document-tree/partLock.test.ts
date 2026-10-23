import { describe, expect, it } from 'vitest'
import {
  filterPartLocksForPartIds,
  isPartLocked,
  setPartLock,
  togglePartLock,
} from './partLock'

describe('partLock', () => {
  it('isPartLocked reads map', () => {
    expect(isPartLocked({}, 'a')).toBe(false)
    expect(isPartLocked({ a: true }, 'a')).toBe(true)
    expect(isPartLocked({ a: false }, 'a')).toBe(false)
  })

  it('togglePartLock adds and removes', () => {
    const locked = togglePartLock({}, 'p1')
    expect(locked).toEqual({ p1: true })
    expect(togglePartLock(locked, 'p1')).toEqual({})
  })

  it('setPartLock sets explicit state', () => {
    expect(setPartLock({}, 'p1', true)).toEqual({ p1: true })
    expect(setPartLock({ p1: true }, 'p1', false)).toEqual({})
  })

  it('filterPartLocksForPartIds drops missing parts', () => {
    const filtered = filterPartLocksForPartIds(
      { a: true, b: true, c: true },
      new Set(['a', 'c']),
    )
    expect(filtered).toEqual({ a: true, c: true })
  })
})
