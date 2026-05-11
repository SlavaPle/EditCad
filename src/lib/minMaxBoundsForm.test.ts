import { describe, expect, it } from 'vitest'
import { parseMinMaxBoundsForm } from './minMaxBoundsForm'

describe('parseMinMaxBoundsForm', () => {
  it('gdy MIN wyłączony: minMm = 0 przy poprawnym MAX', () => {
    expect(
      parseMinMaxBoundsForm({
        useMinBound: false,
        minMmInput: '',
        maxMmInput: '25',
      }),
    ).toEqual({ ok: true, minMm: 0, maxMm: 25 })
  })

  it('gdy MIN wyłączony: ignoruje treść pola MIN', () => {
    expect(
      parseMinMaxBoundsForm({
        useMinBound: false,
        minMmInput: 'garbage',
        maxMmInput: '10',
      }),
    ).toEqual({ ok: true, minMm: 0, maxMm: 10 })
  })

  it('gdy MIN włączony: akceptuje dodatnie MIN i MAX', () => {
    expect(
      parseMinMaxBoundsForm({
        useMinBound: true,
        minMmInput: '3',
        maxMmInput: '40',
      }),
    ).toEqual({ ok: true, minMm: 3, maxMm: 40 })
  })

  it('gdy MIN włączony: odrzuca puste lub zerowe MIN', () => {
    expect(
      parseMinMaxBoundsForm({
        useMinBound: true,
        minMmInput: '',
        maxMmInput: '10',
      }),
    ).toEqual({ ok: false, reason: 'invalidMinWhenEnabled' })
    expect(
      parseMinMaxBoundsForm({
        useMinBound: true,
        minMmInput: '0',
        maxMmInput: '10',
      }),
    ).toEqual({ ok: false, reason: 'invalidMinWhenEnabled' })
  })

  it('odrzuca niepoprawne MAX', () => {
    expect(
      parseMinMaxBoundsForm({
        useMinBound: false,
        minMmInput: '',
        maxMmInput: '',
      }),
    ).toEqual({ ok: false, reason: 'invalidMax' })
  })

  it('odrzuca MIN > MAX', () => {
    expect(
      parseMinMaxBoundsForm({
        useMinBound: true,
        minMmInput: '50',
        maxMmInput: '10',
      }),
    ).toEqual({ ok: false, reason: 'invalidRange' })
  })

  it('akceptuje przecinek dziesiętny w MAX', () => {
    const r = parseMinMaxBoundsForm({
      useMinBound: true,
      minMmInput: '1',
      maxMmInput: '12,5',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.maxMm).toBeCloseTo(12.5)
    }
  })
})
