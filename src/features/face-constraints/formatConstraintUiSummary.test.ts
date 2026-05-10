import { describe, expect, it } from 'vitest'
import { shortenConstraintElementId } from './formatConstraintUiSummary'

describe('shortenConstraintElementId', () => {
  it('returns short ids unchanged', () => {
    expect(shortenConstraintElementId('ea')).toBe('ea')
    expect(shortenConstraintElementId('el-simple')).toBe('el-simple')
  })

  it('shortens very long ids with ellipsis middle', () => {
    const tail = `tag-${'x'.repeat(24)}`
    const long = `prz-1778438014204-7nod-fz1-abcd-${tail}`
    const out = shortenConstraintElementId(long, 28)
    expect(out.length).toBeLessThanOrEqual(28)
    expect(out).toContain('…')
    expect(out.startsWith('prz-')).toBe(true)
    expect(out.endsWith(tail.slice(-10))).toBe(true)
  })

  it('respects trim', () => {
    expect(shortenConstraintElementId('  short  ', 28)).toBe('short')
  })
})
