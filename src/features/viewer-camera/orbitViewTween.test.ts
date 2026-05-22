import { describe, expect, it, vi } from 'vitest'
import { Object3D, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { applyOrbitViewOrientation, computeOrbitViewQuaternionForDirection } from './orbitViewRotation'
import {
  beginOrbitViewTweenToDirection,
  finishOrbitViewTween,
  stepOrbitViewTween,
  ORBIT_VIEW_SNAP_ANGLE,
  ORBIT_VIEW_TURN_RATE,
} from './orbitViewTween'
import { computeDreiBrokenViewQuaternion } from './orbitViewRotation'

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

describe('beginOrbitViewTweenToDirection', () => {
  it('keeps controls enabled and uses focus override', () => {
    const controls = mockOrbitControls(new Vector3(0, 0, 0))
    const partCenter = new Vector3(5, 2, 3)
    const session = beginOrbitViewTweenToDirection(
      new Vector3(0, 0, 1),
      controls.object,
      controls,
      partCenter,
    )
    expect(controls.enabled).toBe(true)
    expect(session.focusPoint.toArray()).toEqual([5, 2, 3])
    expect(controls.target.toArray()).toEqual([5, 2, 3])
  })
})

describe('stepOrbitViewTween', () => {
  it('rotates q1 toward q2 each frame', () => {
    const session = {
      focusPoint: new Vector3(),
      radius: 10,
      q1: new Quaternion(),
      q2: new Quaternion(),
      defaultUp: new Vector3(0, 1, 0),
    }
    computeOrbitViewQuaternionForDirection(new Vector3(1, 0, 0), session.focusPoint, session.radius, session.q2)

    const angleBefore = session.q1.angleTo(session.q2)
    expect(stepOrbitViewTween(session, 1 / ORBIT_VIEW_TURN_RATE)).toBe('animating')
    expect(session.q1.angleTo(session.q2)).toBeLessThan(angleBefore)
  })
})

describe('finishOrbitViewTween', () => {
  it('syncs controls target and calls update', () => {
    const controls = mockOrbitControls(new Vector3(1, 0, 0))
    const session = beginOrbitViewTweenToDirection(new Vector3(0, 1, 0), controls.object, controls)
    finishOrbitViewTween(session, controls.object, controls)
    expect(controls.target.toArray()).toEqual(session.focusPoint.toArray())
    expect(controls.update).toHaveBeenCalled()
  })
})

describe('computeDreiBrokenViewQuaternion', () => {
  it('matches focus-based tween when focus is at origin', () => {
    const focus = new Vector3(0, 0, 0)
    const cameraPos = new Vector3(0, 5, 5)
    const direction = new Vector3(0, 0, 1)
    const fixed = new Quaternion()
    const broken = new Quaternion()

    const radius = cameraPos.distanceTo(focus)
    computeOrbitViewQuaternionForDirection(direction, focus, radius, fixed)
    computeDreiBrokenViewQuaternion(direction, cameraPos, broken)

    expect(fixed.angleTo(broken)).toBeLessThan(1e-6)
  })
})

describe('full tween to top view', () => {
  it('snaps camera above offset focus after simulated frames', () => {
    const focus = new Vector3(4, -2, 7)
    const controls = mockOrbitControls(focus)
    controls.object.position.set(4, 6, 7)

    const session = beginOrbitViewTweenToDirection(new Vector3(0, 1, 0), controls.object, controls)

    let status: 'animating' | 'finished' = 'animating'
    for (let i = 0; i < 500 && status === 'animating'; i++) {
      status = stepOrbitViewTween(session, 1 / 30)
      applyOrbitViewOrientation(session.q1, session.radius, session.focusPoint, controls.object)
    }
    finishOrbitViewTween(session, controls.object, controls)

    expect(controls.object.position.y).toBeCloseTo(focus.y + session.radius, 4)
    expect(controls.object.position.distanceTo(focus)).toBeCloseTo(session.radius, 4)
  })
})
