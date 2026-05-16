import { Object3D, Quaternion, Vector3, type Camera } from 'three'
import {
  applyOrbitCameraQuaternion,
  computeCameraQuaternionForViewDirection,
  computeOrbitRadius,
} from './viewCubeCameraTween'

export const VIEW_CUBE_SNAP_ANGLE = 0.01
export const VIEW_CUBE_TURN_RATE = 2 * Math.PI

export type OrbitControlsLike = {
  object: Camera
  target: Vector3
  update: (delta?: number) => void
  enableDamping: boolean
  enabled: boolean
  getDistance?: () => number
}

export function isOrbitControlsLike(controls: unknown): controls is OrbitControlsLike {
  if (controls == null || typeof controls !== 'object') return false
  const c = controls as OrbitControlsLike
  return (
    c.target instanceof Vector3 &&
    typeof c.update === 'function' &&
    c.object != null &&
    typeof c.enableDamping === 'boolean'
  )
}

/** Kamera sterowana przez OrbitControls (nie kamera HUD po makeDefault). */
export function resolveOrbitCamera(controls: unknown, fallbackCamera: Camera): Camera {
  return isOrbitControlsLike(controls) ? controls.object : fallbackCamera
}

export type ViewCubeTweenSession = {
  focusPoint: Vector3
  radius: number
  q1: Quaternion
  q2: Quaternion
  dampingBeforeTween: boolean
  controlsEnabledBeforeTween: boolean
}

export function beginViewCubeTween(
  direction: Vector3,
  camera: { position: Vector3; quaternion: Quaternion },
  controls: OrbitControlsLike | null | undefined,
): ViewCubeTweenSession {
  const focusPoint = new Vector3()
  let dampingBeforeTween = true
  let controlsEnabledBeforeTween = true

  if (isOrbitControlsLike(controls)) {
    dampingBeforeTween = controls.enableDamping
    controlsEnabledBeforeTween = controls.enabled
    controls.enableDamping = false
    controls.enabled = false
    focusPoint.copy(controls.target)
  } else {
    focusPoint.set(0, 0, 0)
  }

  const radius =
    isOrbitControlsLike(controls) && typeof controls.getDistance === 'function'
      ? controls.getDistance()
      : computeOrbitRadius(camera.position, focusPoint)
  const q1 = camera.quaternion.clone()
  const q2 = new Quaternion()
  computeCameraQuaternionForViewDirection(direction, focusPoint, radius, q2)

  return { focusPoint, radius, q1, q2, dampingBeforeTween, controlsEnabledBeforeTween }
}

export function stepViewCubeTween(session: ViewCubeTweenSession, delta: number): 'animating' | 'finished' {
  const step = delta * VIEW_CUBE_TURN_RATE
  if (session.q1.angleTo(session.q2) <= VIEW_CUBE_SNAP_ANGLE) {
    session.q1.copy(session.q2)
    return 'finished'
  }
  session.q1.rotateTowards(session.q2, step)
  if (session.q1.angleTo(session.q2) <= VIEW_CUBE_SNAP_ANGLE) {
    session.q1.copy(session.q2)
    return 'finished'
  }
  return 'animating'
}

export function applyViewCubeTweenFrame(
  session: ViewCubeTweenSession,
  camera: { position: Vector3; up: Vector3; quaternion: Quaternion },
): void {
  applyOrbitCameraQuaternion(session.q1, session.radius, session.focusPoint, camera)
}

export function finishViewCubeTween(
  session: ViewCubeTweenSession,
  camera: { position: Vector3; up: Vector3; quaternion: Quaternion },
  controls: OrbitControlsLike | null | undefined,
): void {
  session.q1.copy(session.q2)
  applyOrbitCameraQuaternion(session.q2, session.radius, session.focusPoint, camera)

  if (isOrbitControlsLike(controls)) {
    controls.enableDamping = session.dampingBeforeTween
    controls.enabled = session.controlsEnabledBeforeTween
    controls.target.copy(session.focusPoint)
    controls.update()
  }
}

const brokenTarget = /* @__PURE__ */ new Vector3()

/** Błędne obliczenie z drei GizmoHelper (radius/lookAt względem (0,0,0)). */
export function computeDreiBrokenViewQuaternion(
  direction: Vector3,
  cameraPosition: Vector3,
  outQuaternion: Quaternion,
): Quaternion {
  const radius = cameraPosition.distanceTo(brokenTarget)
  const len = direction.length()
  if (len < 1e-8) {
    outQuaternion.identity()
    return outQuaternion
  }
  const lookAtPoint = direction.clone().multiplyScalar(radius / len)
  const dummy = new Object3D()
  dummy.lookAt(lookAtPoint)
  outQuaternion.copy(dummy.quaternion)
  return outQuaternion
}
