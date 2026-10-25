import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  angleBetweenDirections,
  quaternionOrientDirections,
} from './orientDirectionsAtAngle'

describe('quaternionOrientDirections', () => {
  it('orients to 90° relative to reference', () => {
    const from = new Vector3(1, 0.2, 0).normalize()
    const reference = new Vector3(1, 0, 0)
    const q = quaternionOrientDirections(from, reference, Math.PI / 2, false)
    const result = from.clone().applyQuaternion(q)
    expect(angleBetweenDirections(result, reference)).toBeCloseTo(Math.PI / 2, 4)
  })

  it('0 and 1 are absolute solutions (not a relative toggle)', () => {
    const reference = new Vector3(1, 0, 0)
    const fromNear0 = new Vector3(0.7, 0.7, 0).normalize()
    const fromNear1 = new Vector3(0.7, -0.7, 0).normalize()

    const apply = (from: Vector3, flipped: boolean) => {
      const q = quaternionOrientDirections(from, reference, Math.PI / 4, flipped)
      return from.clone().applyQuaternion(q)
    }

    const a0 = apply(fromNear0, false)
    const b0 = apply(fromNear1, false)
    const a1 = apply(fromNear0, true)
    const b1 = apply(fromNear1, true)

    // To samo flipped ⇒ ten sam absolutny cel (niezależnie od startu)
    expect(a0.distanceTo(b0)).toBeLessThan(1e-4)
    expect(a1.distanceTo(b1)).toBeLessThan(1e-4)

    expect(angleBetweenDirections(a0, reference)).toBeCloseTo(Math.PI / 4, 4)
    expect(angleBetweenDirections(a1, reference)).toBeCloseTo(Math.PI / 4, 4)
    expect(a0.distanceTo(a1)).toBeGreaterThan(0.5)
  })

  it('0°: flip 0 aligns with reference, flip 1 with opposite', () => {
    const from = new Vector3(0, 1, 0)
    const reference = new Vector3(1, 0, 0)
    const q0 = quaternionOrientDirections(from, reference, 0, false)
    const q1 = quaternionOrientDirections(from, reference, 0, true)
    const r0 = from.clone().applyQuaternion(q0)
    const r1 = from.clone().applyQuaternion(q1)
    expect(angleBetweenDirections(r0, reference)).toBeCloseTo(0, 4)
    expect(angleBetweenDirections(r1, reference.clone().negate())).toBeCloseTo(0, 4)
  })
})
