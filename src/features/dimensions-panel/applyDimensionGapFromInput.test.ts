import { describe, expect, it, vi } from 'vitest'
import { BufferGeometry } from 'three'
import { applyDimensionGapFromInput } from './applyDimensionGapFromInput'

const mergedFaces = [0, 1] as const

describe('applyDimensionGapFromInput', () => {
  it('returns validation error without calling stretch', () => {
    const onApply = vi.fn()
    expect(
      applyDimensionGapFromInput(
        {
          inputText: '',
          geometry: new BufferGeometry(),
          mergedFaces,
          faceConstraints: [],
          modelElements: [],
        },
        onApply,
      ),
    ).toEqual({ ok: false, error: 'invalidTarget', envelope: null })
    expect(onApply).not.toHaveBeenCalled()
  })

  it('returns invalidGeometry when merged faces are missing', () => {
    const onApply = vi.fn()
    expect(
      applyDimensionGapFromInput(
        {
          inputText: '10',
          geometry: new BufferGeometry(),
          mergedFaces: null,
          faceConstraints: [],
          modelElements: [],
        },
        onApply,
      ),
    ).toEqual({ ok: false, error: 'invalidGeometry', envelope: null })
    expect(onApply).not.toHaveBeenCalled()
  })

  it('forwards to applyTargetDistanceFromInput with merged faces', () => {
    const g = new BufferGeometry()
    const onApply = vi.fn().mockReturnValue({ ok: true as const, geometry: g, effectiveTargetMm: 10 })
    const r = applyDimensionGapFromInput(
      {
        inputText: '10',
        geometry: new BufferGeometry(),
        mergedFaces,
        faceConstraints: [],
        modelElements: [],
      },
      onApply,
    )
    expect(r.ok).toBe(true)
    expect(onApply).toHaveBeenCalledWith(10, {
      mergedFaces: [0, 1],
      rejectClampedTarget: true,
    })
  })
})
