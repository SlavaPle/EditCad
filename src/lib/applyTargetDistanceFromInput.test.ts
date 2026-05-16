import { describe, expect, it, vi } from 'vitest'
import { BufferGeometry } from 'three'
import { applyTargetDistanceFromInput } from './applyTargetDistanceFromInput'

describe('applyTargetDistanceFromInput', () => {
  it('returns invalidTarget when parsing fails', () => {
    const fn = vi.fn()
    expect(applyTargetDistanceFromInput('', fn)).toEqual({ ok: false, error: 'invalidTarget' })
    expect(applyTargetDistanceFromInput('-1', fn)).toEqual({ ok: false, error: 'invalidTarget' })
    expect(fn).not.toHaveBeenCalled()
  })

  it('calls onApplyTwoFaceStretch with rejectClampedTarget and forwards overlay', () => {
    const g = new BufferGeometry()
    const fn = vi.fn().mockReturnValue({ ok: true as const, geometry: g, effectiveTargetMm: 12 })
    const mergedFaces = [1, 2, 3] as const
    const r = applyTargetDistanceFromInput('10,5', fn, { mergedFaces })
    expect(r.ok).toBe(true)
    expect(fn).toHaveBeenCalledWith(10.5, {
      mergedFaces,
      rejectClampedTarget: true,
    })
  })
})
