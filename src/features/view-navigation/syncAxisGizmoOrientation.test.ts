import { describe, expect, it } from 'vitest'
import { Euler, Matrix4, Object3D, Quaternion, Vector3 } from 'three'
import { syncAxisGizmoOrientation } from './syncAxisGizmoOrientation'

function cameraMatrixLookingFrom(position: Vector3, target = new Vector3(0, 0, 0)): Matrix4 {
  const cam = new Object3D()
  cam.position.copy(position)
  cam.up.set(0, 1, 0)
  cam.lookAt(target)
  cam.updateMatrix()
  return cam.matrix.clone()
}

describe('syncAxisGizmoOrientation', () => {
  it('sets gizmo quaternion from inverted camera matrix', () => {
    const cameraMatrix = cameraMatrixLookingFrom(new Vector3(0, 0, 5))
    const gizmoQ = new Quaternion()
    const expected = new Quaternion().setFromRotationMatrix(cameraMatrix.clone().invert())

    syncAxisGizmoOrientation(cameraMatrix, gizmoQ)

    expect(gizmoQ.angleTo(expected)).toBeLessThan(1e-6)
  })

  it('tracks camera yaw so world +X matches inverted view rotation', () => {
    const yaw = Math.PI / 4
    const distance = 5
    const position = new Vector3(Math.sin(yaw) * distance, 0, Math.cos(yaw) * distance)
    const cameraMatrix = cameraMatrixLookingFrom(position)
    const gizmoQ = new Quaternion()

    syncAxisGizmoOrientation(cameraMatrix, gizmoQ)

    const worldX = new Vector3(1, 0, 0).applyQuaternion(gizmoQ)
    const viewX = new Vector3(1, 0, 0).transformDirection(cameraMatrix.clone().invert())
    expect(worldX.distanceTo(viewX)).toBeLessThan(1e-5)
  })

  it('reuses optional scratch matrix without changing result', () => {
    const cameraMatrix = new Matrix4().makeRotationFromEuler(new Euler(0.3, -0.7, 0.1))
    const scratch = new Matrix4().makeScale(2, 2, 2)
    const a = new Quaternion()
    const b = new Quaternion()

    syncAxisGizmoOrientation(cameraMatrix, a)
    syncAxisGizmoOrientation(cameraMatrix, b, scratch)

    expect(a.angleTo(b)).toBeLessThan(1e-6)
    // scratch kończy jako inverted camera matrix
    expect(scratch.equals(cameraMatrix.clone().invert())).toBe(true)
  })

  it('returns the same quaternion instance', () => {
    const cameraMatrix = cameraMatrixLookingFrom(new Vector3(1, 2, 3))
    const gizmoQ = new Quaternion()
    const result = syncAxisGizmoOrientation(cameraMatrix, gizmoQ)
    expect(result).toBe(gizmoQ)
  })
})
