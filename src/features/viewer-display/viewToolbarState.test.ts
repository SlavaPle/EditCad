import { describe, expect, it } from 'vitest'
import { canChangeViewDisplayMode } from './viewToolbarState'

describe('canChangeViewDisplayMode', () => {
  it('is false when scene is empty', () => {
    expect(
      canChangeViewDisplayMode({
        hasMainModel: false,
        programPartGeometryCount: 0,
        hasPhantomAssembly: false,
      }),
    ).toBe(false)
  })

  it('is true with main part model only', () => {
    expect(
      canChangeViewDisplayMode({
        hasMainModel: true,
        programPartGeometryCount: 0,
        hasPhantomAssembly: false,
      }),
    ).toBe(true)
  })

  it('is true when assembly has loaded program parts', () => {
    expect(
      canChangeViewDisplayMode({
        hasMainModel: false,
        programPartGeometryCount: 2,
        hasPhantomAssembly: false,
      }),
    ).toBe(true)
  })

  it('is true when only phantom assembly is present', () => {
    expect(
      canChangeViewDisplayMode({
        hasMainModel: false,
        programPartGeometryCount: 0,
        hasPhantomAssembly: true,
      }),
    ).toBe(true)
  })
})
