import { describe, expect, it } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import { VIEW_CUBE_FACE_DIRECTIONS, VIEW_CUBE_FACE_NAMES } from './viewCubeAxisDirections'
import { VIEW_CUBE_FACE_KEYS } from './viewCubeFaces'
import {
  applyOrbitCameraQuaternion,
  computeCameraQuaternionForViewDirection,
} from './viewCubeCameraTween'

describe('VIEW_CUBE_FACE_DIRECTIONS', () => {
  it('lists six axis-aligned unit normals', () => {
    expect(VIEW_CUBE_FACE_DIRECTIONS).toHaveLength(6)
    expect(VIEW_CUBE_FACE_NAMES).toHaveLength(6)
    for (const dir of VIEW_CUBE_FACE_DIRECTIONS) {
      expect(dir.length()).toBeCloseTo(1, 6)
    }
  })

  it('aligns with i18n face key order (right, left, top, bottom, front, back)', () => {
    expect(VIEW_CUBE_FACE_KEYS).toEqual([
      'viewer.viewCube.faceRight',
      'viewer.viewCube.faceLeft',
      'viewer.viewCube.faceTop',
      'viewer.viewCube.faceBottom',
      'viewer.viewCube.faceFront',
      'viewer.viewCube.faceBack',
    ])
    expect(VIEW_CUBE_FACE_NAMES[2]).toBe('top')
    expect(VIEW_CUBE_FACE_DIRECTIONS[2]!.y).toBe(1)
  })
})

describe.each([
  { name: 'right', index: 0, axis: 'x' as const, sign: 1 },
  { name: 'left', index: 1, axis: 'x' as const, sign: -1 },
  { name: 'top', index: 2, axis: 'y' as const, sign: 1 },
  { name: 'bottom', index: 3, axis: 'y' as const, sign: -1 },
  { name: 'front', index: 4, axis: 'z' as const, sign: 1 },
  { name: 'back', index: 5, axis: 'z' as const, sign: -1 },
])('orthographic snap $name', ({ index, axis, sign }) => {
  it('places camera on the correct axis relative to focus', () => {
    const focus = new Vector3(-3, 2, 5)
    const radius = 9
    const direction = VIEW_CUBE_FACE_DIRECTIONS[index]!
    const q = new Quaternion()
    computeCameraQuaternionForViewDirection(direction, focus, radius, q)

    const camera = { position: new Vector3(), up: new Vector3(0, 1, 0), quaternion: new Quaternion() }
    applyOrbitCameraQuaternion(q, radius, focus, camera)

    expect(camera.position[axis]).toBeCloseTo(focus[axis] + sign * radius, 5)
    expect(camera.position.distanceTo(focus)).toBeCloseTo(radius, 5)
  })
})
