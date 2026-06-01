import { describe, expect, it, afterEach } from 'vitest'
import { Vector3 } from 'three'
import {
  isSceneOrbitSuspended,
  resetSceneOrbitSuspendForTests,
  resumeSceneOrbit,
  suspendSceneOrbit,
} from './orbitControlsSuspend'
import type { OrbitControlsLike } from './orbitViewRotation'

function mockControls(enabled = true): OrbitControlsLike {
  return {
    object: {} as OrbitControlsLike['object'],
    target: new Vector3(),
    update: () => {},
    enabled,
  }
}

describe('orbitControlsSuspend', () => {
  afterEach(() => {
    resetSceneOrbitSuspendForTests()
  })

  it('disables controls on first suspend and restores after last resume', () => {
    const controls = mockControls(true)
    expect(isSceneOrbitSuspended()).toBe(false)

    suspendSceneOrbit(controls)
    expect(isSceneOrbitSuspended()).toBe(true)
    expect(controls.enabled).toBe(false)

    suspendSceneOrbit(controls)
    expect(controls.enabled).toBe(false)

    resumeSceneOrbit(controls)
    expect(isSceneOrbitSuspended()).toBe(true)
    expect(controls.enabled).toBe(false)

    resumeSceneOrbit(controls)
    expect(isSceneOrbitSuspended()).toBe(false)
    expect(controls.enabled).toBe(true)
  })

  it('restores previous disabled state', () => {
    const controls = mockControls(false)
    suspendSceneOrbit(controls)
    resumeSceneOrbit(controls)
    expect(controls.enabled).toBe(false)
  })
})
