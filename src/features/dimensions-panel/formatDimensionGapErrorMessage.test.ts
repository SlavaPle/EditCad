import { describe, expect, it, vi } from 'vitest'
import { formatDimensionGapErrorMessage } from './formatDimensionGapErrorMessage'

describe('formatDimensionGapErrorMessage', () => {
  it('uses bound hint translation with envelope interpolation', () => {
    const t = vi.fn((key: string, opts?: Record<string, number>) => `${key}:${JSON.stringify(opts)}`)
    const i18n = { exists: vi.fn(() => false) }
    const msg = formatDimensionGapErrorMessage(t, i18n as never, 'belowMin', {
      matchedConstraintCount: 1,
      pinConstMm: null,
      lower: 10,
      upper: 50,
    })
    expect(msg).toContain('rightPanel.faceDistance.boundHints.belowMin')
    expect(t).toHaveBeenCalledWith('rightPanel.faceDistance.boundHints.belowMin', {
      minMm: 10,
      maxMm: 50,
      exactMm: 0,
    })
  })

  it('falls back to faceDistance.errors when key exists', () => {
    const t = vi.fn((key: string) => key)
    const i18n = { exists: vi.fn((key: string) => key === 'rightPanel.faceDistance.errors.invalidTarget') }
    expect(formatDimensionGapErrorMessage(t, i18n as never, 'invalidTarget', null)).toBe(
      'rightPanel.faceDistance.errors.invalidTarget',
    )
  })

  it('returns raw error when no translation exists', () => {
    const t = vi.fn()
    const i18n = { exists: vi.fn(() => false) }
    expect(formatDimensionGapErrorMessage(t, i18n as never, 'customCode', null)).toBe('customCode')
  })
})
