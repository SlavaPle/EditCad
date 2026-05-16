import { Object3D, Quaternion, Vector3 } from 'three'

const scratchLookAt = /* @__PURE__ */ new Vector3()
const scratchOffset = /* @__PURE__ */ new Vector3()
const scratchDummy = /* @__PURE__ */ new Object3D()

/** Utrzymuje stałą odległość kamery od focus (bez zoomu podczas obrotu). */
export function enforceCameraOrbitRadius(
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

/** Odległość kamery od punktu obrotu OrbitControls. */
export function computeOrbitRadius(cameraPosition: Vector3, focusPoint: Vector3): number {
  return cameraPosition.distanceTo(focusPoint)
}

/**
 * Kwaterion kamery patrzącej na focusPoint z pozycji focus + direction * radius.
 * Poprawka względem drei GizmoHelper (tam używany jest stały wektor (0,0,0)).
 */
export function computeCameraQuaternionForViewDirection(
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

export function applyOrbitCameraQuaternion(
  quaternion: Quaternion,
  radius: number,
  focusPoint: Vector3,
  camera: { position: Vector3; up: Vector3; quaternion: Quaternion },
): void {
  camera.position.set(0, 0, 1).applyQuaternion(quaternion).multiplyScalar(radius).add(focusPoint)
  enforceCameraOrbitRadius(camera, focusPoint, radius)
  camera.up.set(0, 1, 0).applyQuaternion(quaternion).normalize()
  camera.quaternion.copy(quaternion)
}
