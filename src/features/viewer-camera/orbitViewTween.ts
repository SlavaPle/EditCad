import { Quaternion, Vector3 } from 'three'
import {
  applyOrbitViewOrientation,
  commitOrbitViewToControls,
  computeOrbitViewQuaternionForDirection,
  getOrbitViewFocusPoint,
  getOrbitViewRadius,
  syncOrbitViewFocus,
  type OrbitControlsLike,
} from './orbitViewRotation'

export const ORBIT_VIEW_SNAP_ANGLE = 0.01
export const ORBIT_VIEW_TURN_RATE = 2 * Math.PI

export type OrbitViewTweenSession = {
  focusPoint: Vector3
  radius: number
  q1: Quaternion
  q2: Quaternion
  defaultUp: Vector3
}

/**
 * Rozpoczyna animowany obrót widoku do kierunku (gizmo-kostka).
 * Używa tego samego focus i promienia co obrót myszą.
 */
export function beginOrbitViewTweenToDirection(
  direction: Vector3,
  camera: { position: Vector3; quaternion: Quaternion; up: Vector3 },
  controls: OrbitControlsLike | null | undefined,
  focusOverride?: Vector3,
): OrbitViewTweenSession {
  const focusPoint = getOrbitViewFocusPoint(controls, focusOverride)
  syncOrbitViewFocus(controls, focusPoint)

  const radius = getOrbitViewRadius(camera, focusPoint, controls)
  const q1 = camera.quaternion.clone()
  const q2 = new Quaternion()
  computeOrbitViewQuaternionForDirection(direction, focusPoint, radius, q2)

  return { focusPoint, radius, q1, q2, defaultUp: camera.up.clone() }
}

export function stepOrbitViewTween(session: OrbitViewTweenSession, delta: number): 'animating' | 'finished' {
  const step = delta * ORBIT_VIEW_TURN_RATE
  if (session.q1.angleTo(session.q2) <= ORBIT_VIEW_SNAP_ANGLE) {
    session.q1.copy(session.q2)
    return 'finished'
  }
  session.q1.rotateTowards(session.q2, step)
  if (session.q1.angleTo(session.q2) <= ORBIT_VIEW_SNAP_ANGLE) {
    session.q1.copy(session.q2)
    return 'finished'
  }
  return 'animating'
}

export function applyOrbitViewTweenFrame(
  session: OrbitViewTweenSession,
  camera: { position: Vector3; up: Vector3; quaternion: Quaternion },
): void {
  applyOrbitViewOrientation(session.q1, session.radius, session.focusPoint, camera)
}

export function finishOrbitViewTween(
  session: OrbitViewTweenSession,
  camera: { position: Vector3; up: Vector3; quaternion: Quaternion },
  controls: OrbitControlsLike | null | undefined,
  delta?: number,
): void {
  session.q1.copy(session.q2)
  applyOrbitViewOrientation(session.q2, session.radius, session.focusPoint, camera)
  commitOrbitViewToControls(camera, session.focusPoint, controls, session.defaultUp, delta)
}
