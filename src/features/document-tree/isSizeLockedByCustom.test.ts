import { describe, expect, it } from 'vitest'
import { isSizeLockedByCustom } from './isSizeLockedByCustom'

describe('isSizeLockedByCustom', () => {
  it('true dla lockedByCustom / customConflict', () => {
    expect(isSizeLockedByCustom({ sizeStatus: 'lockedByCustom' })).toBe(true)
    expect(isSizeLockedByCustom({ sizeLockReason: 'customConflict' })).toBe(true)
  })

  it('false dla free / const', () => {
    expect(isSizeLockedByCustom({ sizeStatus: 'free' })).toBe(false)
    expect(isSizeLockedByCustom({ sizeStatus: 'const' })).toBe(false)
  })
})
