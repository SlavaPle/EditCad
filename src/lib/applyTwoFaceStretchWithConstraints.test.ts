import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three'
import type { FaceConstraint } from '../features/face-constraints/model'
import type { PreparedElementConstraints } from './preparedElementFormat'
import { analyzeTwoFaceStretch } from './twoFaceStretch'
import { applyTwoFaceStretchWithConstraints } from './applyTwoFaceStretchWithConstraints'

function geometryTwoParallelPatches(zSep: number): BufferGeometry {
  const g = new BufferGeometry()
  const z = zSep
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, z, 1, 0, z, 1, 1, z, 0, 1, z,
  ])
  g.setAttribute('position', new Float32BufferAttribute(positions, 3))
  g.setIndex(new Uint16BufferAttribute([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7], 1))
  return g
}

const mergedFourFaces = [0, 1, 2, 3] as const

const pairPrepared: PreparedElementConstraints = {
  mode: 'fixed',
  faceConstraints: [],
  modelElements: [
    { id: 'ea', faceIndices: [0, 1] },
    { id: 'eb', faceIndices: [2, 3] },
  ],
}

function gapMm(geometry: BufferGeometry): number {
  const an = analyzeTwoFaceStretch(geometry, mergedFourFaces)
  expect(an.ok).toBe(true)
  if (!an.ok) throw new Error('expected stretch analysis ok')
  return an.gapMm
}

function withMaxConstraint(maxMm: number): PreparedElementConstraints {
  const c: FaceConstraint = {
    id: 'max1',
    type: 'max',
    facePair: null,
    elementAId: 'ea',
    elementBId: 'eb',
    valueMm: maxMm,
  }
  return { ...pairPrepared, faceConstraints: [c] }
}

describe('applyTwoFaceStretchWithConstraints', () => {
  it('rejects above MAX with rejectClampedTarget and leaves geometry unchanged', () => {
    const geometry = geometryTwoParallelPatches(10)
    const before = gapMm(geometry)
    const prepared = withMaxConstraint(8)

    const result = applyTwoFaceStretchWithConstraints({
      geometry,
      targetMm: 50,
      mergedFaces: mergedFourFaces,
      prepared,
      constraintsLocked: true,
      overlay: { rejectClampedTarget: true },
    })

    expect(result).toEqual({ ok: false, error: 'lockedMax' })
    expect(gapMm(geometry)).toBeCloseTo(before, 4)
  })

  it('rejects below MIN with rejectClampedTarget and leaves geometry unchanged', () => {
    const geometry = geometryTwoParallelPatches(10)
    const before = gapMm(geometry)
    const c: FaceConstraint = {
      id: 'min1',
      type: 'min',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 20,
    }
    const prepared: PreparedElementConstraints = { ...pairPrepared, faceConstraints: [c] }

    const result = applyTwoFaceStretchWithConstraints({
      geometry,
      targetMm: 5,
      mergedFaces: mergedFourFaces,
      prepared,
      constraintsLocked: true,
      overlay: { rejectClampedTarget: true },
    })

    expect(result).toEqual({ ok: false, error: 'lockedMin' })
    expect(gapMm(geometry)).toBeCloseTo(before, 4)
  })

  it('rejects CONST mismatch with rejectClampedTarget', () => {
    const geometry = geometryTwoParallelPatches(10)
    const before = gapMm(geometry)
    const c: FaceConstraint = {
      id: 'co',
      type: 'const',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 12,
    }
    const prepared: PreparedElementConstraints = { ...pairPrepared, faceConstraints: [c] }

    const result = applyTwoFaceStretchWithConstraints({
      geometry,
      targetMm: 20,
      mergedFaces: mergedFourFaces,
      prepared,
      constraintsLocked: true,
      overlay: { rejectClampedTarget: true },
    })

    expect(result).toEqual({ ok: false, error: 'lockedExact' })
    expect(gapMm(geometry)).toBeCloseTo(before, 4)
  })

  it('applies in-range target when rejectClampedTarget is set', () => {
    const geometry = geometryTwoParallelPatches(10)
    const prepared = withMaxConstraint(30)

    const result = applyTwoFaceStretchWithConstraints({
      geometry,
      targetMm: 15,
      mergedFaces: mergedFourFaces,
      prepared,
      constraintsLocked: true,
      overlay: { rejectClampedTarget: true },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.effectiveTargetMm).toBeCloseTo(15, 4)
    expect(gapMm(result.geometry)).toBeCloseTo(15, 3)
  })

  it('clamps to MAX when rejectClampedTarget is not set', () => {
    const geometry = geometryTwoParallelPatches(10)
    const prepared = withMaxConstraint(8)

    const result = applyTwoFaceStretchWithConstraints({
      geometry,
      targetMm: 50,
      mergedFaces: mergedFourFaces,
      prepared,
      constraintsLocked: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.effectiveTargetMm).toBeCloseTo(8, 4)
    expect(gapMm(result.geometry)).toBeCloseTo(8, 3)
  })

  it('does not reject clamp when constraints are unlocked', () => {
    const geometry = geometryTwoParallelPatches(10)
    const prepared = withMaxConstraint(8)

    const result = applyTwoFaceStretchWithConstraints({
      geometry,
      targetMm: 50,
      mergedFaces: mergedFourFaces,
      prepared,
      constraintsLocked: false,
      overlay: { rejectClampedTarget: true },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.effectiveTargetMm).toBeCloseTo(50, 4)
    expect(gapMm(result.geometry)).toBeCloseTo(50, 3)
  })

  it('returns lockedByBlock without changing geometry', () => {
    const geometry = geometryTwoParallelPatches(10)
    const before = gapMm(geometry)
    const prepared: PreparedElementConstraints = {
      ...pairPrepared,
      faceConstraints: [{ id: 'blk', type: 'block', facePair: null }],
    }

    const result = applyTwoFaceStretchWithConstraints({
      geometry,
      targetMm: 15,
      mergedFaces: mergedFourFaces,
      prepared,
      constraintsLocked: true,
      overlay: { rejectClampedTarget: true },
    })

    expect(result).toEqual({ ok: false, error: 'lockedByBlock' })
    expect(gapMm(geometry)).toBeCloseTo(before, 4)
  })

  it('rejects empty mergedFaces', () => {
    const geometry = geometryTwoParallelPatches(10)
    const result = applyTwoFaceStretchWithConstraints({
      geometry,
      targetMm: 12,
      mergedFaces: [],
      prepared: pairPrepared,
      constraintsLocked: true,
      overlay: { rejectClampedTarget: true },
    })
    expect(result).toEqual({ ok: false, error: 'invalidGeometry' })
  })
})
