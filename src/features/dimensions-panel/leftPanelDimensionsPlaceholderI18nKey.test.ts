import { describe, expect, it } from 'vitest'
import { leftPanelDimensionsPlaceholderI18nKey } from './leftPanelDimensionsPlaceholderI18nKey'

describe('leftPanelDimensionsPlaceholderI18nKey', () => {
  it('returns no-model key when hasModel is false', () => {
    expect(leftPanelDimensionsPlaceholderI18nKey(false)).toBe(
      'leftPanel.dimensions.placeholderNoModel',
    )
  })

  it('returns ready key when hasModel is true', () => {
    expect(leftPanelDimensionsPlaceholderI18nKey(true)).toBe(
      'leftPanel.dimensions.placeholderReady',
    )
  })
})
