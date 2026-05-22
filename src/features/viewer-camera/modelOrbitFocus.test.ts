import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BufferAttribute, BufferGeometry, PerspectiveCamera, Vector3 } from 'three'
import {
  applyOrbitCameraQuaternion,
  computeCameraQuaternionForViewDirection,
} from '../view-navigation/viewCubeCameraTween'
import { beginViewCubeTween, stepViewCubeTween } from '../view-navigation/viewCubeOrbitTween'
import { getModelOrbitFocusPoint, syncOrbitFocusFromGeometry } from './modelOrbitFocus'
import { orbitFocusPointWorld } from './orbitFocusPointWorld'

function boxGeometry(min: [number, number, number], max: [number, number, number]): BufferGeometry {
  const geo = new BufferGeometry()
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  geo.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([x0, y0, z0, x1, y1, z1]),
      3,
    ),
  )
  return geo
}

function mockOrbitControls(target = new Vector3()) {
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

beforeEach(() => {
  orbitFocusPointWorld.set(0, 0, 0)
})

describe('getModelOrbitFocusPoint', () => {
  it('returns AABB center from vertices', () => {
    const geo = boxGeometry([0, 0, 0], [4, 2, 6])
    const c = getModelOrbitFocusPoint(geo)
    expect(c.x).toBeCloseTo(2)
    expect(c.y).toBeCloseTo(1)
    expect(c.z).toBeCloseTo(3)
  })

  it('does not return origin when only min corner is at zero', () => {
    const geo = boxGeometry([0, 0, 0], [10, 4, 6])
    const c = getModelOrbitFocusPoint(geo)
    expect(c.x).toBeCloseTo(5)
    expect(c.y).toBeCloseTo(2)
    expect(c.z).toBeCloseTo(3)
    expect(c.length()).toBeGreaterThan(1)
  })
})

describe('syncOrbitFocusFromGeometry', () => {
  it('copies center into controls.target, world store and updates', () => {
    const geo = boxGeometry([10, 0, 0], [14, 4, 8])
    const target = new Vector3()
    const update = vi.fn()
    const controls = { target, update, object: {}, enableDamping: true, enabled: true }
    expect(syncOrbitFocusFromGeometry(controls, geo)).toBe(true)
    expect(target.x).toBeCloseTo(12)
    expect(target.y).toBeCloseTo(2)
    expect(target.z).toBeCloseTo(4)
    expect(orbitFocusPointWorld.x).toBeCloseTo(12)
    expect(update).toHaveBeenCalled()
  })

  it('returns false for geometry without positions', () => {
    const geo = new BufferGeometry()
    const controls = { target: new Vector3(), update: vi.fn(), object: {}, enableDamping: true, enabled: true }
    expect(syncOrbitFocusFromGeometry(controls, geo)).toBe(false)
    expect(controls.update).not.toHaveBeenCalled()
  })

  it('returns false for non-orbit controls', () => {
    const geo = boxGeometry([0, 0, 0], [2, 2, 2])
    expect(syncOrbitFocusFromGeometry(null, geo)).toBe(false)
    expect(syncOrbitFocusFromGeometry({ target: new Vector3() }, geo)).toBe(false)
  })

  it('overwrites stale target at origin with part center', () => {
    const geo = boxGeometry([0, 0, 0], [10, 4, 6])
    const controls = mockOrbitControls(new Vector3(0, 0, 0))
    syncOrbitFocusFromGeometry(controls, geo)
    expect(controls.target.x).toBeCloseTo(5)
    expect(controls.target.y).toBeCloseTo(2)
    expect(controls.target.z).toBeCloseTo(3)
  })
})

describe('ViewCube orbit focus regression', () => {
  it('tween keeps camera on sphere around geometry center, not world origin', () => {
    const geo = boxGeometry([0, 0, 0], [10, 4, 6])
    const partCenter = getModelOrbitFocusPoint(geo)
    const controls = mockOrbitControls(new Vector3(0, 0, 0))
    controls.object.position.set(12, 14, 8)

    const session = beginViewCubeTween(
      new Vector3(0, 1, 0),
      controls.object,
      controls,
      partCenter,
    )

    expect(session.focusPoint.toArray()).toEqual(partCenter.toArray())
    expect(controls.target.toArray()).toEqual(partCenter.toArray())

    for (let i = 0; i < 20; i++) {
      stepViewCubeTween(session, 1 / 30)
      applyOrbitCameraQuaternion(session.q1, session.radius, session.focusPoint, controls.object)
      expect(controls.object.position.distanceTo(partCenter)).toBeCloseTo(session.radius, 4)
      expect(controls.object.position.distanceTo(new Vector3(0, 0, 0))).not.toBeCloseTo(
        session.radius,
        1,
      )
    }
  })

  it('top view after sync places camera above geometry center', () => {
    const geo = boxGeometry([0, 0, 0], [10, 0, 0])
    const center = getModelOrbitFocusPoint(geo)
    const controls = mockOrbitControls(new Vector3(0, 0, 0))
    syncOrbitFocusFromGeometry(controls, geo)
    controls.object.position.set(center.x + 5, center.y + 8, center.z + 5)

    const session = beginViewCubeTween(new Vector3(0, 1, 0), controls.object, controls, center)
    const q = session.q2
    computeCameraQuaternionForViewDirection(new Vector3(0, 1, 0), center, session.radius, q)
    applyOrbitCameraQuaternion(q, session.radius, center, controls.object)

    expect(controls.object.position.distanceTo(center)).toBeCloseTo(session.radius, 4)
    expect(controls.object.position.y).toBeGreaterThan(center.y)
    expect(controls.object.position.x).toBeCloseTo(center.x, 3)
  })
})
