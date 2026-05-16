import { describe, expect, it, vi } from 'vitest'
import { Object3D, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import {
  applyOrbitCameraQuaternion,
  computeCameraQuaternionForViewDirection,
} from './viewCubeCameraTween'
import {
  beginViewCubeTween,
  computeDreiBrokenViewQuaternion,
  finishViewCubeTween,
  isOrbitControlsLike,
  resolveOrbitCamera,
  stepViewCubeTween,
  VIEW_CUBE_SNAP_ANGLE,
  VIEW_CUBE_TURN_RATE,
} from './viewCubeOrbitTween'

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

describe('isOrbitControlsLike', () => {
  it('detects orbit controls with target, object and update', () => {
    expect(isOrbitControlsLike(mockOrbitControls())).toBe(true)
    expect(isOrbitControlsLike(null)).toBe(false)
    expect(isOrbitControlsLike({ target: new Vector3(), update: () => {} })).toBe(false)
  })
})

describe('resolveOrbitCamera', () => {
  it('returns controls.object instead of store camera', () => {
    const controls = mockOrbitControls()
    const hudCamera = new PerspectiveCamera()
    expect(resolveOrbitCamera(controls, hudCamera)).toBe(controls.object)
    expect(resolveOrbitCamera(null, hudCamera)).toBe(hudCamera)
  })
})

describe('beginViewCubeTween', () => {
  it('disables damping and orbit updates during tween', () => {
    const controls = mockOrbitControls(new Vector3(8, 2, 4))
    controls.object.position.set(8, 12, 4)

    const session = beginViewCubeTween(new Vector3(0, 1, 0), controls.object, controls)

    expect(controls.enableDamping).toBe(false)
    expect(controls.enabled).toBe(false)
    expect(session.focusPoint.toArray()).toEqual([8, 2, 4])
    expect(session.dampingBeforeTween).toBe(true)
    expect(session.controlsEnabledBeforeTween).toBe(true)
    expect(session.radius).toBeCloseTo(10, 5)
    expect(session.q2.angleTo(new Quaternion())).toBeGreaterThan(0.01)
  })

  it('falls back to world origin without controls', () => {
    const camera = new PerspectiveCamera()
    camera.position.set(3, 4, 5)
    const session = beginViewCubeTween(new Vector3(0, 0, 1), camera, null)
    expect(session.focusPoint.toArray()).toEqual([0, 0, 0])
    expect(session.radius).toBeCloseTo(Math.hypot(3, 4, 5), 5)
  })
})

describe('stepViewCubeTween', () => {
  it('rotates q1 toward q2 each frame', () => {
    const session = {
      focusPoint: new Vector3(),
      radius: 10,
      q1: new Quaternion(),
      q2: new Quaternion(),
      dampingBeforeTween: true,
      controlsEnabledBeforeTween: true,
    }
    computeCameraQuaternionForViewDirection(new Vector3(1, 0, 0), session.focusPoint, session.radius, session.q2)

    const angleBefore = session.q1.angleTo(session.q2)
    expect(stepViewCubeTween(session, 1 / VIEW_CUBE_TURN_RATE)).toBe('animating')
    expect(session.q1.angleTo(session.q2)).toBeLessThan(angleBefore)
  })

  it('returns finished when already aligned', () => {
    const session = {
      focusPoint: new Vector3(),
      radius: 5,
      q1: new Quaternion(),
      q2: new Quaternion(),
      dampingBeforeTween: false,
      controlsEnabledBeforeTween: true,
    }
    session.q1.copy(session.q2)
    expect(stepViewCubeTween(session, 0.016)).toBe('finished')
    expect(session.q1.angleTo(session.q2)).toBeLessThan(VIEW_CUBE_SNAP_ANGLE)
  })

  it('snaps q1 to q2 on the finishing step', () => {
    const session = {
      focusPoint: new Vector3(),
      radius: 5,
      q1: new Quaternion(),
      q2: new Quaternion(),
      dampingBeforeTween: false,
      controlsEnabledBeforeTween: true,
    }
    computeCameraQuaternionForViewDirection(new Vector3(0, 1, 0), session.focusPoint, session.radius, session.q2)
    session.q1.copy(session.q2)
    session.q1.rotateTowards(session.q2, -0.5)
    expect(stepViewCubeTween(session, 1 / 60)).toBe('finished')
    expect(session.q1.angleTo(session.q2)).toBe(0)
  })
})

describe('finishViewCubeTween', () => {
  it('restores damping, enabled flag and syncs controls target', () => {
    const controls = mockOrbitControls(new Vector3(1, 0, 0))
    const session = beginViewCubeTween(new Vector3(0, 1, 0), controls.object, controls)
    finishViewCubeTween(session, controls.object, controls)

    expect(controls.enableDamping).toBe(true)
    expect(controls.enabled).toBe(true)
    expect(controls.target.toArray()).toEqual(session.focusPoint.toArray())
    expect(controls.update).toHaveBeenCalledTimes(1)
    expect(controls.object.position.distanceTo(session.focusPoint)).toBeCloseTo(session.radius, 5)
  })
})

describe('computeDreiBrokenViewQuaternion', () => {
  it('computeDreiBrokenViewQuaternion uses camera distance to origin as radius', () => {
    const cameraPos = new Vector3(10, 8, 0)
    const focusRadius = cameraPos.distanceTo(new Vector3(10, 0, 0))
    const brokenRadius = cameraPos.distanceTo(new Vector3(0, 0, 0))

    expect(brokenRadius).not.toBeCloseTo(focusRadius, 3)
    expect(brokenRadius).toBeCloseTo(Math.hypot(10, 8), 4)
  })

  it('matches focus-based tween when focus is at origin', () => {
    const focus = new Vector3(0, 0, 0)
    const cameraPos = new Vector3(0, 5, 5)
    const direction = new Vector3(0, 0, 1)
    const fixed = new Quaternion()
    const broken = new Quaternion()

    const radius = cameraPos.distanceTo(focus)
    computeCameraQuaternionForViewDirection(direction, focus, radius, fixed)
    computeDreiBrokenViewQuaternion(direction, cameraPos, broken)

    expect(fixed.angleTo(broken)).toBeLessThan(1e-6)
  })
})

describe('full tween to top view', () => {
  it('keeps orbit radius constant across animation frames', () => {
    const focus = new Vector3(1, 2, 3)
    const controls = mockOrbitControls(focus)
    controls.object.position.set(4, 6, 3)
    const session = beginViewCubeTween(new Vector3(0, 0, 1), controls.object, controls)
    const startRadius = session.radius

    for (let i = 0; i < 30; i++) {
      stepViewCubeTween(session, 1 / 30)
      applyOrbitCameraQuaternion(session.q1, session.radius, session.focusPoint, controls.object)
      expect(controls.object.position.distanceTo(focus)).toBeCloseTo(startRadius, 5)
    }
  })

  it('snaps camera above offset focus after simulated frames', () => {
    const focus = new Vector3(4, -2, 7)
    const controls = mockOrbitControls(focus)
    controls.object.position.set(4, 6, 7)

    const session = beginViewCubeTween(new Vector3(0, 1, 0), controls.object, controls)

    let status: 'animating' | 'finished' = 'animating'
    for (let i = 0; i < 500 && status === 'animating'; i++) {
      status = stepViewCubeTween(session, 1 / 30)
      applyOrbitCameraQuaternion(session.q1, session.radius, session.focusPoint, controls.object)
    }
    finishViewCubeTween(session, controls.object, controls)

    expect(controls.object.position.y).toBeCloseTo(focus.y + session.radius, 4)
    expect(controls.object.position.distanceTo(focus)).toBeCloseTo(session.radius, 4)

    const forward = new Vector3(0, 0, -1).applyQuaternion(controls.object.quaternion).normalize()
    const toFocus = focus.clone().sub(controls.object.position).normalize()
    expect(forward.dot(toFocus)).toBeGreaterThan(0.99)
  })
})
