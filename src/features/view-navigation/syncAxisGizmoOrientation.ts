import { Matrix4, type Quaternion } from 'three'

/**
 * Ustawia kwaternion gizmosu tak, by śledził orientację kamery
 * (ta sama inwersja macierzy co ViewCube / drei GizmoHelper).
 */
export function syncAxisGizmoOrientation(
  cameraMatrix: Matrix4,
  gizmoQuaternion: Quaternion,
  scratch: Matrix4 = new Matrix4(),
): Quaternion {
  scratch.copy(cameraMatrix).invert()
  gizmoQuaternion.setFromRotationMatrix(scratch)
  return gizmoQuaternion
}
