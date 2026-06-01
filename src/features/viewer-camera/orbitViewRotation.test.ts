import { describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Quaternion, Vector3 } from 'three'
import {
  resetSceneOrbitSuspendForTests,
  suspendSceneOrbit,
} from './orbitControlsSuspend'
import {
  applyOrbitViewOrientation,
  computeOrbitViewQuaternionForDirection,
  getOrbitViewRadius,
  isOrbitControlsLike,
  resolveOrbitCamera,
  syncOrbitViewFocus,
  updateOrbitViewFromMouse,
} from './orbitViewRotation'

function mockOrbitControls(target = new Vector3(3, 1, -2)) {
  const camera = new PerspectiveCamera()
  const targetVec = target.clone()
  return {
    object: camera,
    target: targetVec,
    enableDamping: true,
    enabled: true,
    getDistance: () => camera.position.distanceTo(targetVec),
    update: vi.fn(),
  }
}

describe('updateOrbitViewFromMouse', () => {
  it('calls controls.update when enabled', () => {
    const controls = mockOrbitControls()
    updateOrbitViewFromMouse(controls, 0.016)
    expect(controls.update).toHaveBeenCalledWith(0.016)
  })

  it('skips update when controls disabled', () => {
    const controls = mockOrbitControls()
    controls.enabled = false
    updateOrbitViewFromMouse(controls)
    expect(controls.update).not.toHaveBeenCalled()
  })

  it('skips update while scene manipulator holds orbit suspended', () => {
    const controls = mockOrbitControls()
    suspendSceneOrbit(controls)
    updateOrbitViewFromMouse(controls)
    expect(controls.update).not.toHaveBeenCalled()
    resetSceneOrbitSuspendForTests()
    controls.enabled = true
  })
})

describe('syncOrbitViewFocus', () => {
  it('copies focus to controls.target and updates', () => {
    const controls = mockOrbitControls()
    syncOrbitViewFocus(controls, new Vector3(1, 2, 3))
    expect(controls.target.toArray()).toEqual([1, 2, 3])
    expect(controls.update).toHaveBeenCalled()
  })
})

describe('resolveOrbitCamera', () => {
  it('returns controls.object instead of store camera', () => {
    const controls = mockOrbitControls()
    const hudCamera = new PerspectiveCamera()
    expect(resolveOrbitCamera(controls, hudCamera)).toBe(controls.object)
  })
})

describe('applyOrbitViewOrientation', () => {
  it('places top view camera above focus on +Y', () => {
    const focus = new Vector3(4, -2, 7)
    const radius = 12
    const q = new Quaternion()
    computeOrbitViewQuaternionForDirection(new Vector3(0, 1, 0), focus, radius, q)

    const camera = { position: new Vector3(), up: new Vector3(0, 1, 0), quaternion: new Quaternion() }
    applyOrbitViewOrientation(q, radius, focus, camera)

    expect(camera.position.y).toBeCloseTo(focus.y + radius, 5)
    expect(getOrbitViewRadius(camera, focus)).toBeCloseTo(radius, 5)
  })
})

describe('isOrbitControlsLike', () => {
  it('detects orbit controls with target, object and update', () => {
    expect(isOrbitControlsLike(mockOrbitControls())).toBe(true)
    expect(isOrbitControlsLike(null)).toBe(false)
  })
})
