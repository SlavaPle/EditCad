import { describe, expect, it } from 'vitest'
import {
  panelAxisBoundsFromMinMaxForm,
  panelAxisBoundsFromParsed,
} from './panelAxisBoundsFromMinMaxForm'

/** Odwzorowanie pól formularza PANEL (grupa 2/3) przed buildPanelInstallBundle. */
describe('panel install form axis bounds', () => {
  it('maps X and Y MIN/MAX independently for full panel', () => {
    const x = panelAxisBoundsFromMinMaxForm({
      useMinBound: true,
      minMmInput: '10',
      maxMmInput: '100',
    })
    const y = panelAxisBoundsFromMinMaxForm({
      useMinBound: false,
      minMmInput: '',
      maxMmInput: '200',
    })
    expect(x.ok).toBe(true)
    expect(y.ok).toBe(true)
    if (!x.ok || !y.ok) return
    expect(panelAxisBoundsFromParsed(x)).toEqual({ minMm: 10, maxMm: 100 })
    expect(panelAxisBoundsFromParsed(y)).toEqual({ maxMm: 200 })
  })

  it('rejects invalid range for panel axis', () => {
    const bad = panelAxisBoundsFromMinMaxForm({
      useMinBound: true,
      minMmInput: '50',
      maxMmInput: '10',
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.reason).toBe('invalidRange')
  })
})
