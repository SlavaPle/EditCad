import { describe, expect, it } from 'vitest'
import {
  panelAxisBoundsFromMinMaxForm,
  panelAxisBoundsFromParsed,
} from './panelAxisBoundsFromMinMaxForm'

describe('panelAxisBoundsFromMinMaxForm', () => {
  it('maps valid MIN/MAX to PanelAxisBounds', () => {
    const parsed = panelAxisBoundsFromMinMaxForm({
      useMinBound: true,
      minMmInput: '2',
      maxMmInput: '20',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(panelAxisBoundsFromParsed(parsed)).toEqual({ minMm: 2, maxMm: 20 })
  })

  it('omits minMm when MIN bound is off', () => {
    const parsed = panelAxisBoundsFromMinMaxForm({
      useMinBound: false,
      minMmInput: '',
      maxMmInput: '15',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(panelAxisBoundsFromParsed(parsed)).toEqual({ maxMm: 15 })
  })
})
