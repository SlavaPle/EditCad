import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { isViewDirectionActive } from './viewDirectionActive'

describe('isViewDirectionActive', () => {
  const focus = new Vector3(1, 2, 3)

  it('returns true when camera offset matches direction', () => {
    const camera = { position: new Vector3(1, 12, 3) }
    expect(isViewDirectionActive(camera, focus, new Vector3(0, 1, 0))).toBe(true)
  })

  it('returns false for opposite direction', () => {
    const camera = { position: new Vector3(1, -8, 3) }
    expect(isViewDirectionActive(camera, focus, new Vector3(0, 1, 0))).toBe(false)
  })

  it('returns false when camera sits on focus point', () => {
    const camera = { position: focus.clone() }
    expect(isViewDirectionActive(camera, focus, new Vector3(0, 1, 0))).toBe(false)
  })
})
