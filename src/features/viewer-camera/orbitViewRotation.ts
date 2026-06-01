import { Object3D, Quaternion, Vector3, type Camera } from 'three'
import { isSceneOrbitSuspended } from './orbitControlsSuspend'

const scratchLookAt = /* @__PURE__ */ new Vector3()
const scratchOffset = /* @__PURE__ */ new Vector3()
const scratchDummy = /* @__PURE__ */ new Object3D()

export type OrbitControlsLike = {
  object: Camera
  target: Vector3
  update: (delta?: number) => void
  enableDamping?: boolean
  enabled?: boolean
  getDistance?: () => number
}

export function isOrbitControlsLike(controls: unknown): controls is OrbitControlsLike {
  if (controls == null || typeof controls !== 'object') return false
  const c = controls as OrbitControlsLike
  return c.target instanceof Vector3 && typeof c.update === 'function' && c.object != null
}

/** Kamera sterowana przez OrbitControls (nie kamera HUD). */
export function resolveOrbitCamera(controls: unknown, fallbackCamera: Camera): Camera {
  return isOrbitControlsLike(controls) ? controls.object : fallbackCamera
}

export function getOrbitViewFocusPoint(
  controls: unknown,
  focusOverride?: Vector3,
  out = new Vector3(),
): Vector3 {
  if (focusOverride) return out.copy(focusOverride)
  if (isOrbitControlsLike(controls)) return out.copy(controls.target)
  return out.set(0, 0, 0)
}

export function computeOrbitRadius(cameraPosition: Vector3, focusPoint: Vector3): number {
  return cameraPosition.distanceTo(focusPoint)
}

export function getOrbitViewRadius(
  camera: { position: Vector3 },
  focusPoint: Vector3,
  controls?: OrbitControlsLike | null,
): number {
  if (controls && typeof controls.getDistance === 'function') {
    return controls.getDistance()
  }
  return computeOrbitRadius(camera.position, focusPoint)
}

/** Ustawia target OrbitControls — ten sam punkt obrotu co przy myszy (śPM). */
export function syncOrbitViewFocus(controls: unknown, focusPoint: Vector3): void {
  if (!isOrbitControlsLike(controls)) return
  controls.target.copy(focusPoint)
  controls.update()
}

/**
 * Obrót widoku myszą (OrbitControls.update) — działa przy wciśniętym środkowym przycisku.
 * Jedyna ścieżka aktualizacji widoku podczas przeciągania myszą.
 */
export function updateOrbitViewFromMouse(controls: unknown, delta?: number): void {
  if (!isOrbitControlsLike(controls)) return
  if (isSceneOrbitSuspended() || controls.enabled === false) return
  controls.update(delta)
}

/** Utrzymuje stałą odległość kamery od focus. */
export function enforceOrbitViewRadius(
  camera: { position: Vector3 },
  focusPoint: Vector3,
  radius: number,
): void {
  scratchOffset.copy(camera.position).sub(focusPoint)
  const len = scratchOffset.length()
  if (len < 1e-10) return
  scratchOffset.multiplyScalar(radius / len)
  camera.position.copy(focusPoint).add(scratchOffset)
}

/**
 * Kwaterion kamery: widok z kierunku `direction` (od focus do kamery), jak po obrocie myszą.
 */
export function computeOrbitViewQuaternionForDirection(
  direction: Vector3,
  focusPoint: Vector3,
  radius: number,
  outQuaternion: Quaternion,
): Quaternion {
  const len = direction.length()
  if (len < 1e-8) {
    outQuaternion.identity()
    return outQuaternion
  }
  scratchLookAt.copy(direction).multiplyScalar(radius / len).add(focusPoint)
  scratchDummy.position.copy(focusPoint)
  scratchDummy.lookAt(scratchLookAt)
  outQuaternion.copy(scratchDummy.quaternion)
  return outQuaternion
}

/**
 * Stosuje orientację widoku wokół focus — ta sama geometria co OrbitControls po obrocie myszą.
 */
export function applyOrbitViewOrientation(
  quaternion: Quaternion,
  radius: number,
  focusPoint: Vector3,
  camera: { position: Vector3; up: Vector3; quaternion: Quaternion },
): void {
  camera.position.set(0, 0, 1).applyQuaternion(quaternion).multiplyScalar(radius).add(focusPoint)
  enforceOrbitViewRadius(camera, focusPoint, radius)
  camera.up.set(0, 1, 0).applyQuaternion(quaternion).normalize()
  camera.quaternion.copy(quaternion)
}

/** Po klatce animacji gizmo: synchronizacja wewnętrznego stanu OrbitControls. */
export function commitOrbitViewToControls(
  camera: { up: Vector3 },
  focusPoint: Vector3,
  controls: OrbitControlsLike | null | undefined,
  defaultUp: Vector3,
  delta?: number,
): void {
  if (!isOrbitControlsLike(controls)) return
  camera.up.copy(defaultUp)
  controls.target.copy(focusPoint)
  updateOrbitViewFromMouse(controls, delta)
}

const brokenTarget = /* @__PURE__ */ new Vector3()

/** Błędne obliczenie z drei GizmoHelper (radius względem (0,0,0)). */
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
