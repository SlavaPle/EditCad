import { describe, expect, it } from 'vitest'
import {
  filterPartLocksForPartIds,
  isPartLocked,
  lockedPartIdSet,
  lockedPartIdsFromMap,
  partLockMapFromIds,
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

  it('lockedPartIdSet collects locked ids', () => {
    expect([...lockedPartIdSet({ a: true, b: false, c: true })].sort()).toEqual(['a', 'c'])
  })

  it('round-trips map ↔ id list for .ecdasm', () => {
    expect(lockedPartIdsFromMap({ c: true, a: true, b: false })).toEqual(['a', 'c'])
    expect(partLockMapFromIds(['b', 'a', 'b'])).toEqual({ a: true, b: true })
    expect(partLockMapFromIds(undefined)).toEqual({})
  })
})
