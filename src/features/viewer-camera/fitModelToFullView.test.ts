import { describe, expect, it } from 'vitest'
import { Box3, BufferAttribute, BufferGeometry, PerspectiveCamera, Vector3 } from 'three'
import { getGeometryGeometricCenter } from '../model-transform/geometricCenter'
import { orbitFocusPointWorld } from './orbitFocusPointWorld'
import {
  computeFitDistanceForBox,
  fitModelToFullView,
  getGeometryWorldBox,
} from './fitModelToFullView'

function boxGeometry(size: number): BufferGeometry {
  const geo = new BufferGeometry()
  const h = size / 2
  const positions = new Float32Array([
    -h, -h, -h, h, -h, -h, h, h, -h, -h, h, -h,
    -h, -h, h, h, -h, h, h, h, h, -h, h, h,
  ])
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  return geo
}

describe('getGeometryWorldBox', () => {
  it('returns null for empty geometry', () => {
    expect(getGeometryWorldBox(new BufferGeometry())).toBeNull()
  })

  it('wraps vertex positions', () => {
    const geo = boxGeometry(10)
    const box = getGeometryWorldBox(geo, new Box3())
    expect(box).not.toBeNull()
    expect(box!.max.x - box!.min.x).toBeCloseTo(10, 5)
  })
})

describe('computeFitDistanceForBox', () => {
  it('scales with box size and margin', () => {
    const cam = new PerspectiveCamera(50, 1, 0.1, 1000)
    const box = new Box3(new Vector3(-5, -5, -5), new Vector3(5, 5, 5))
    const d1 = computeFitDistanceForBox(box, cam, 1)
    const d2 = computeFitDistanceForBox(box, cam, 2)
    expect(d2).toBeCloseTo(d1 * 2, 5)
  })

  it('returns fallback distance for degenerate box', () => {
    const cam = new PerspectiveCamera(50, 1, 0.1, 1000)
    const box = new Box3(new Vector3(1, 2, 3), new Vector3(1, 2, 3))
    expect(computeFitDistanceForBox(box, cam, 1.05)).toBe(10)
  })
})

describe('fitModelToFullView', () => {
  it('places camera at distance from geometric center', () => {
    const geo = boxGeometry(20)
    const cam = new PerspectiveCamera(50, 1, 0.1, 10000)
    cam.position.set(100, 100, 100)
    const target = new Vector3()
    const controls = {
      object: cam,
      target,
      update: () => {},
    }

    expect(fitModelToFullView(geo, cam, controls, { viewDirection: new Vector3(0, 0, 1) })).toBe(true)

    expect(cam.position.distanceTo(target)).toBeGreaterThan(5)
    const toTarget = target.clone().sub(cam.position).normalize()
    const forward = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize()
    expect(forward.dot(toTarget)).toBeGreaterThan(0.98)
  })

  it('returns false for non-perspective camera', () => {
    const geo = boxGeometry(10)
    const cam = { isPerspectiveCamera: false } as unknown as PerspectiveCamera
    expect(fitModelToFullView(geo, cam, null)).toBe(false)
  })

  it('returns false for empty geometry', () => {
    const cam = new PerspectiveCamera(50, 1, 0.1, 1000)
    expect(fitModelToFullView(new BufferGeometry(), cam, null)).toBe(false)
  })

  it('syncs orbit target and focus point to geometric center', () => {
    const geo = boxGeometry(20)
    const center = getGeometryGeometricCenter(geo)
    const cam = new PerspectiveCamera(50, 1, 0.1, 10000)
    const target = new Vector3(99, 99, 99)
    const controls = {
      object: cam,
      target,
      update: () => {},
    }

    expect(fitModelToFullView(geo, cam, controls, { viewDirection: new Vector3(1, 0, 0) })).toBe(true)

    expect(target.toArray()).toEqual(center.toArray())
    expect(orbitFocusPointWorld.toArray()).toEqual(center.toArray())
  })
})
