import { describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import {
  applyOrbitViewOrientation,
  commitOrbitViewToControls,
  computeOrbitViewQuaternionForDirection,
} from './orbitViewRotation'

function mockControls(withPolar: boolean) {
  const camera = new PerspectiveCamera()
  const target = new Vector3(0, 0, 0)
  return {
    object: camera,
    target,
    enabled: true,
    update: vi.fn(),
    ...(withPolar ? { getPolarAngle: () => 1 } : { staticMoving: true }),
  }
}

describe('commitOrbitViewToControls', () => {
  it('restores defaultUp when controls expose getPolarAngle', () => {
    const controls = mockControls(true)
    const defaultUp = new Vector3(0, 1, 0)
    controls.object.up.set(0.2, 0.3, 0.9).normalize()
    commitOrbitViewToControls(controls.object, new Vector3(), controls, defaultUp)
    expect(controls.object.up.toArray()).toEqual(defaultUp.toArray())
    expect(controls.update).toHaveBeenCalled()
  })

  it('preserves oriented up for Trackball (no getPolarAngle)', () => {
    const controls = mockControls(false)
    const focus = new Vector3(0, 0, 0)
    const q = computeOrbitViewQuaternionForDirection(new Vector3(0, 0, 1), focus, 10, controls.object.quaternion.clone())
    applyOrbitViewOrientation(q, 10, focus, controls.object)
    const orientedUp = controls.object.up.clone()
    const defaultUp = new Vector3(0, 0, 1)

    commitOrbitViewToControls(controls.object, focus, controls, defaultUp)

    expect(controls.object.up.distanceTo(orientedUp)).toBeLessThan(1e-9)
    expect(controls.object.up.toArray()).not.toEqual(defaultUp.toArray())
  })
})
