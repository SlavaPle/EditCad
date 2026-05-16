import { describe, expect, it, vi } from 'vitest'
import { fitModelToView } from './fitModelToView'

describe('fitModelToView', () => {
  it('calls refresh, reset, fit and clip in order', () => {
    const clip = vi.fn().mockReturnThis()
    const fit = vi.fn(() => ({ clip }))
    const reset = vi.fn(() => ({ fit }))
    const refresh = vi.fn(() => ({ reset }))
    const api = { refresh, reset, fit, clip }

    fitModelToView(api)

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(reset).toHaveBeenCalledTimes(1)
    expect(fit).toHaveBeenCalledTimes(1)
    expect(clip).toHaveBeenCalledTimes(1)
  })

  it('ignores null api', () => {
    expect(() => fitModelToView(null)).not.toThrow()
  })
})
