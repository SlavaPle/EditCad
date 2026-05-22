import { describe, expect, it } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import {
  applyOrbitCameraQuaternion,
  computeCameraQuaternionForViewDirection,
  computeOrbitRadius,
  enforceCameraOrbitRadius,
} from './viewCubeCameraTween'

describe('computeOrbitRadius', () => {
  it('uses focus point for orbit radius, not world origin', () => {
    const camera = new Vector3(10, 5, 10)
    const focus = new Vector3(10, 0, 10)
    expect(computeOrbitRadius(camera, focus)).toBeCloseTo(5, 5)
    expect(computeOrbitRadius(camera, new Vector3(0, 0, 0))).toBeCloseTo(Math.hypot(10, 5, 10), 5)
  })
})

describe('computeCameraQuaternionForViewDirection', () => {
  it('returns identity for zero-length direction', () => {
    const q = new Quaternion().set(0.2, 0.3, 0.4, 0.5)
    computeCameraQuaternionForViewDirection(new Vector3(), new Vector3(1, 2, 3), 10, q)
    expect(q.x).toBe(0)
    expect(q.y).toBe(0)
    expect(q.z).toBe(0)
    expect(q.w).toBe(1)
  })

  it('treats unnormalized direction same as unit vector', () => {
    const focus = new Vector3(1, 2, 3)
    const qUnit = new Quaternion()
    const qScaled = new Quaternion()
    computeCameraQuaternionForViewDirection(new Vector3(0, 2, 0), focus, 8, qUnit)
    computeCameraQuaternionForViewDirection(new Vector3(0, 10, 0), focus, 8, qScaled)
    expect(qUnit.angleTo(qScaled)).toBeLessThan(1e-6)
  })

  it('places top view camera above focus on +Y', () => {
    const focus = new Vector3(4, -2, 7)
    const radius = 12
    const q = new Quaternion()
    computeCameraQuaternionForViewDirection(new Vector3(0, 1, 0), focus, radius, q)

    const camera = { position: new Vector3(), up: new Vector3(0, 1, 0), quaternion: new Quaternion() }
    applyOrbitCameraQuaternion(q, radius, focus, camera)

    expect(camera.position.x).toBeCloseTo(focus.x, 5)
    expect(camera.position.y).toBeCloseTo(focus.y + radius, 5)
    expect(camera.position.distanceTo(focus)).toBeCloseTo(radius, 5)
  })

  it('places front view on +Z of offset focus', () => {
    const focus = new Vector3(5, 0, 0)
    const radius = 10
    const q = new Quaternion()
    computeCameraQuaternionForViewDirection(new Vector3(0, 0, 1), focus, radius, q)

    const camera = { position: new Vector3(), up: new Vector3(0, 1, 0), quaternion: new Quaternion() }
    applyOrbitCameraQuaternion(q, radius, focus, camera)

    expect(camera.position.x).toBeCloseTo(5, 5)
    expect(camera.position.y).toBeCloseTo(0, 5)
    expect(camera.position.z).toBeCloseTo(10, 5)
  })

  it('supports diagonal edge directions (normalized)', () => {
    const focus = new Vector3(0, 0, 0)
    const radius = 10
    const edge = new Vector3(1, 1, 0)
    const q = new Quaternion()
    computeCameraQuaternionForViewDirection(edge, focus, radius, q)

    const camera = { position: new Vector3(), up: new Vector3(0, 1, 0), quaternion: new Quaternion() }
    applyOrbitCameraQuaternion(q, radius, focus, camera)

    expect(camera.position.x).toBeCloseTo(radius / Math.SQRT2, 4)
    expect(camera.position.y).toBeCloseTo(radius / Math.SQRT2, 4)
    expect(camera.position.z).toBeCloseTo(0, 5)
  })
})

describe('enforceCameraOrbitRadius', () => {
  it('rescales position to exact radius without changing direction', () => {
    const focus = new Vector3(2, 0, 0)
    const camera = { position: new Vector3(2, 9, 0) }
    enforceCameraOrbitRadius(camera, focus, 5)
    expect(camera.position.distanceTo(focus)).toBeCloseTo(5, 6)
    expect(camera.position.y).toBeGreaterThan(0)
  })
})

describe('applyOrbitCameraQuaternion', () => {
  it('keeps camera on a sphere around focus', () => {
    const focus = new Vector3(2, -1, 3)
    const radius = 15
    const q = new Quaternion()
    computeCameraQuaternionForViewDirection(new Vector3(-1, 0, 1).normalize(), focus, radius, q)

    const camera = { position: new Vector3(), up: new Vector3(0, 1, 0), quaternion: new Quaternion() }
    applyOrbitCameraQuaternion(q, radius, focus, camera)

    expect(camera.position.distanceTo(focus)).toBeCloseTo(radius, 5)
    expect(camera.up.length()).toBeCloseTo(1, 5)
    expect(camera.quaternion.equals(q)).toBe(true)
  })
})

describe('regression vs drei origin radius', () => {
  it('misplaces camera when orbit radius uses world origin instead of focus', () => {
    const focus = new Vector3(10, 0, 0)
    const radius = 8
    const brokenRadius = new Vector3(10, 8, 0).distanceTo(new Vector3(0, 0, 0))
    const q = new Quaternion()
    computeCameraQuaternionForViewDirection(new Vector3(0, 1, 0), focus, radius, q)

    const correct = { position: new Vector3(), up: new Vector3(0, 1, 0), quaternion: new Quaternion() }
    const wrong = { position: new Vector3(), up: new Vector3(0, 1, 0), quaternion: new Quaternion() }
    applyOrbitCameraQuaternion(q, radius, focus, correct)
    applyOrbitCameraQuaternion(q, brokenRadius, focus, wrong)

    expect(brokenRadius).not.toBeCloseTo(radius, 3)
    expect(correct.position.y).toBeCloseTo(8, 5)
    expect(wrong.position.y).toBeCloseTo(brokenRadius, 4)
    expect(wrong.position.y).not.toBeCloseTo(correct.position.y, 1)
  })
})
