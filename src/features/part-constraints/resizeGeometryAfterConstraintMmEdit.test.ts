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

  it('stretches when MIN rises above current gap', () => {
    const geo = geometryTwoParallelPatches(10)
    const c: FaceConstraint = {
      id: 'lo',
      type: 'min',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 16,
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
    if (an.ok) expect(an.gapMm).toBeCloseTo(16, 3)
  })

  it('shrinks gap when MAX is reduced below current', () => {
    const geo = geometryTwoParallelPatches(10)
    const c: FaceConstraint = {
      id: 'hi',
      type: 'max',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 7,
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
    if (an.ok) expect(an.gapMm).toBeCloseTo(7, 3)
  })

  it('shrinks PROFIL stretch gap when new MAX is below current gap', () => {
    const geo = geometryTwoParallelPatches(10)
    const c: FaceConstraint = {
      id: 'pr',
      type: 'profil',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 6,
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
    if (an.ok) expect(an.gapMm).toBeCloseTo(6, 3)
  })

  it('widens PROFIL stretch gap when new MIN exceeds current gap', () => {
    const geo = geometryTwoParallelPatches(8)
    const c: FaceConstraint = {
      id: 'pr2',
      type: 'profil',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 100,
      stretchMinMm: 13,
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
    if (an.ok) expect(an.gapMm).toBeCloseTo(13, 3)
  })

  it('does not resize when CONST is edge-only binding', () => {
    const geo = geometryTwoParallelPatches(10)
    const c: FaceConstraint = {
      id: 'ce',
      type: 'const',
      facePair: null,
      valueMm: 5,
      edgeVertexPair: { va: 0, vb: 1 },
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

  it('does not resize when BLOCK forbids validation', () => {
    const geo = geometryTwoParallelPatches(10)
    const co: FaceConstraint = {
      id: 'co',
      type: 'const',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 18,
    }
    const bl: FaceConstraint = { id: 'bk', type: 'block', facePair: null }
    const list: FaceConstraint[] = [bl, co]
    const prepared: PreparedElementConstraints = { ...pairPrepared, faceConstraints: list }
    const r = resizeGeometryAfterConstraintMmEdit({
      geometry: geo,
      editedConstraint: co,
      allConstraints: list,
      prepared,
    })
    expect(r.gapAdjusted).toBe(false)
  })

  it('works with CONST bound by legacy facePair (no element ids)', () => {
    const geo = geometryTwoParallelPatches(10)
    const c: FaceConstraint = {
      id: 'fk',
      type: 'const',
      facePair: { a: 0, b: 2 },
      elementAId: undefined,
      elementBId: undefined,
      valueMm: 11,
    }
    const prepared: PreparedElementConstraints = {
      mode: 'fixed',
      faceConstraints: [c],
      modelElements: [...pairPrepared.modelElements!],
    }
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
    if (an.ok) expect(an.gapMm).toBeCloseTo(11, 3)
  })
})
