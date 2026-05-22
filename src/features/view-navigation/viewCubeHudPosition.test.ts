import { describe, expect, it } from 'vitest'
import { computeViewCubeHudPosition } from './viewCubeHudPosition'

const viewport = { width: 1200, height: 800 }

describe('computeViewCubeHudPosition', () => {
  it('places top-right with margin from canvas edges', () => {
    const [x, y] = computeViewCubeHudPosition('top-right', [76, 76], viewport)
    expect(x).toBe(1200 / 2 - 76)
    expect(y).toBe(800 / 2 - 76)
  })

  it('places top-left with negative X', () => {
    const [x, y] = computeViewCubeHudPosition('top-left', [40, 60], viewport)
    expect(x).toBe(-1200 / 2 + 40)
    expect(y).toBe(800 / 2 - 60)
  })

  it('places bottom-right with negative Y', () => {
    const [x, y] = computeViewCubeHudPosition('bottom-right', [50, 50], viewport)
    expect(x).toBe(1200 / 2 - 50)
    expect(y).toBe(-800 / 2 + 50)
  })

  it('places bottom-left in lower-left quadrant', () => {
    const [x, y] = computeViewCubeHudPosition('bottom-left', [20, 30], viewport)
    expect(x).toBe(-1200 / 2 + 20)
    expect(y).toBe(-800 / 2 + 30)
  })
})
