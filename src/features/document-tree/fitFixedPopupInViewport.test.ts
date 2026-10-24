import { describe, expect, it } from 'vitest'
import { fitFixedPopupInViewport } from './fitFixedPopupInViewport'

describe('fitFixedPopupInViewport', () => {
  it('nie zmienia pozycji gdy mieści się w oknie', () => {
    expect(
      fitFixedPopupInViewport({
        left: 100,
        top: 100,
        width: 160,
        height: 80,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ left: 100, top: 100 })
  })

  it('przesuwa w górę gdy wystaje poza dół', () => {
    const r = fitFixedPopupInViewport({
      left: 100,
      top: 550,
      width: 160,
      height: 100,
      viewportWidth: 800,
      viewportHeight: 600,
      margin: 8,
    })
    expect(r.top).toBe(600 - 8 - 100)
    expect(r.left).toBe(100)
  })

  it('przesuwa w lewo gdy wystaje poza prawą krawędź', () => {
    const r = fitFixedPopupInViewport({
      left: 700,
      top: 100,
      width: 160,
      height: 80,
      viewportWidth: 800,
      viewportHeight: 600,
      margin: 8,
    })
    expect(r.left).toBe(800 - 8 - 160)
  })
})
