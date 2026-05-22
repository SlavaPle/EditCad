import { describe, expect, it, vi } from 'vitest'
import {
  registerFitModelToFullViewHandler,
  requestFitModelToFullView,
} from './requestFitModelToFullView'

describe('requestFitModelToFullView', () => {
  it('invokes registered handler', () => {
    const fn = vi.fn()
    registerFitModelToFullViewHandler(fn)
    requestFitModelToFullView()
    expect(fn).toHaveBeenCalledTimes(1)
    registerFitModelToFullViewHandler(null)
  })

  it('no-op when handler is null', () => {
    registerFitModelToFullViewHandler(null)
    expect(() => requestFitModelToFullView()).not.toThrow()
  })

  it('replaces previous handler on re-register', () => {
    const first = vi.fn()
    const second = vi.fn()
    registerFitModelToFullViewHandler(first)
    registerFitModelToFullViewHandler(second)
    requestFitModelToFullView()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    registerFitModelToFullViewHandler(null)
  })
})
