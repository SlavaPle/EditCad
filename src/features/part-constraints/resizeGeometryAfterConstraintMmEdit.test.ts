import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedElementConstraints } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import { resizeGeometryAfterConstraintMmEdit } from './resizeGeometryAfterConstraintMmEdit'

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

describe('resizeGeometryAfterConstraintMmEdit', () => {
  it('stretches gap when CONST target increases', () => {
    const geo = geometryTwoParallelPatches(10)
    const c: FaceConstraint = {
      id: 'co',
      type: 'const',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 14,
    }
    const prepared: PreparedElementConstraints = { ...pairPrepared, faceConstraints: [c] }
    const r = resizeGeometryAfterConstraintMmEdit({
      geometry: geo,
      editedConstraint: c,
      allConstraints: [c],
      prepared,
    })
    expect(r.gapAdjusted).toBe(true)
    if (!r.gapAdjusted) throw new Error('expected gap adjusted')
    const an = analyzeTwoFaceStretch(r.geometry, mergedFourFaces)
    expect(an.ok).toBe(true)
    if (an.ok) expect(an.gapMm).toBeCloseTo(14, 3)
  })

  it('does not stretch when gap already matches CONST', () => {
    const geo = geometryTwoParallelPatches(10)
    const c: FaceConstraint = {
      id: 'co',
      type: 'const',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 10,
    }
    const prepared: PreparedElementConstraints = { ...pairPrepared, faceConstraints: [c] }
    const r = resizeGeometryAfterConstraintMmEdit({
      geometry: geo,
      editedConstraint: c,
      allConstraints: [c],
      prepared,
    })
    expect(r.gapAdjusted).toBe(false)
  })

  it('returns no adjust for PANEL type', () => {
    const geo = geometryTwoParallelPatches(5)
    const c: FaceConstraint = {
      id: 'p',
      type: 'panel',
      facePair: null,
      thicknessMm: 2,
      panelX: { maxMm: 100 },
      panelY: { maxMm: 100 },
      ySameAsX: false,
      panelMeasureMode: 'facePairs',
      panelXElementAId: 'ea',
      panelXElementBId: 'eb',
      panelYElementAId: 'ea',
      panelYElementBId: 'eb',
    }
    const prepared: PreparedElementConstraints = { ...pairPrepared, faceConstraints: [c] }
    const r = resizeGeometryAfterConstraintMmEdit({
      geometry: geo,
      editedConstraint: c,
      allConstraints: [c],
      prepared,
    })
    expect(r.gapAdjusted).toBe(false)
  })
})
