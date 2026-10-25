import { describe, expect, it } from 'vitest'
import { MOUSE } from 'three'
import { TRACKBALL_VIEW_MOUSE_BUTTONS } from './trackballViewMouseButtons'

describe('TRACKBALL_VIEW_MOUSE_BUTTONS', () => {
  it('maps middle mouse button index to Trackball ROTATE branch (LEFT slot)', () => {
    expect(TRACKBALL_VIEW_MOUSE_BUTTONS.LEFT).toBe(MOUSE.MIDDLE)
    expect(TRACKBALL_VIEW_MOUSE_BUTTONS.LEFT).toBe(1)
  })

  it('does not bind left-click (0) to any Trackball action slot', () => {
    const values = Object.values(TRACKBALL_VIEW_MOUSE_BUTTONS)
    expect(values).not.toContain(0)
  })

  it('keeps right-click as pan', () => {
    expect(TRACKBALL_VIEW_MOUSE_BUTTONS.RIGHT).toBe(MOUSE.RIGHT)
    expect(TRACKBALL_VIEW_MOUSE_BUTTONS.RIGHT).toBe(2)
  })
})
