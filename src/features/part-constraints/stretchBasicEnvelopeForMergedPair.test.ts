import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import {
  clampStretchTargetMmForBasicConstraints,
  stretchTargetLockedViolationError,
} from './clampStretchTargetForBasicConstraints'
import {
  MIN_STRETCH_GAP_FLOOR_MM,
  stretchBasicEnvelopeForMergedPair,
  stretchInputDeviationKind,
  type StretchBasicEnvelope,
} from './stretchBasicEnvelopeForMergedPair'

function env(partial: Partial<StretchBasicEnvelope> & Pick<StretchBasicEnvelope, 'matchedConstraintCount'>): StretchBasicEnvelope {
  return {
    pinConstMm: null,
    lower: MIN_STRETCH_GAP_FLOOR_MM,
    upper: Number.POSITIVE_INFINITY,
    ...partial,
  }
}

/** Dwa równoległe kwadraty (po 2 trójkąty), odległość między płaszczyznami ≈ zSep mm. */
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
const pairElements: PreparedModelElement[] = [
  { id: 'ea', faceIndices: [0, 1] },
  { id: 'eb', faceIndices: [2, 3] },
]

describe('stretchInputDeviationKind', () => {
  it('returns null when no matching constraints on pair', () => {
    const e = env({ matchedConstraintCount: 0, lower: 5, upper: 20 })
    expect(stretchInputDeviationKind(1, e)).toBeNull()
    expect(stretchInputDeviationKind(100, e)).toBeNull()
  })

  it('flags const mismatch vs pin', () => {
    const e = env({ matchedConstraintCount: 1, pinConstMm: 12, lower: 1, upper: 100 })
    expect(stretchInputDeviationKind(12, e)).toBeNull()
    expect(stretchInputDeviationKind(12.0002, e)).toBe('constMismatch')
    expect(stretchInputDeviationKind(11, e)).toBe('constMismatch')
  })

  it('flags above max when no pin', () => {
    const e = env({ matchedConstraintCount: 1, pinConstMm: null, lower: 2, upper: 50 })
    expect(stretchInputDeviationKind(50, e)).toBeNull()
    expect(stretchInputDeviationKind(50.0002, e)).toBe('aboveMax')
    expect(stretchInputDeviationKind(12, e)).toBeNull()
  })

  it('flags below min when no pin', () => {
    const e = env({ matchedConstraintCount: 1, pinConstMm: null, lower: 20, upper: Number.POSITIVE_INFINITY })
    expect(stretchInputDeviationKind(20, e)).toBeNull()
    expect(stretchInputDeviationKind(19.999, e)).toBe('belowMin')
  })

  it('const pin dominates over min band for classification', () => {
    const e = env({ matchedConstraintCount: 2, pinConstMm: 10, lower: 5, upper: 30 })
    expect(stretchInputDeviationKind(10, e)).toBeNull()
    expect(stretchInputDeviationKind(9, e)).toBe('constMismatch')
  })
})

describe('stretchBasicEnvelopeForMergedPair', () => {
  const geo = geometryTwoParallelPatches(10)

  it('returns null when analyze stretch fails', () => {
    expect(stretchBasicEnvelopeForMergedPair(geo, [], [], [])).toBeNull()
  })

  it('returns matchedCount 0 when no face constraints', () => {
    const e = stretchBasicEnvelopeForMergedPair(geo, mergedFourFaces, [], [])
    expect(e).not.toBeNull()
    expect(e!.matchedConstraintCount).toBe(0)
    expect(e!.upper).toBe(Number.POSITIVE_INFINITY)
    expect(e!.pinConstMm).toBeNull()
  })

  it('accumulates MIN/MAX via element ids', () => {
    const list: FaceConstraint[] = [
      {
        id: 'm',
        type: 'min',
        facePair: null,
        elementAId: 'ea',
        elementBId: 'eb',
        valueMm: 8,
      },
      {
        id: 'x',
        type: 'max',
        facePair: null,
        elementAId: 'ea',
        elementBId: 'eb',
        valueMm: 40,
      },
    ]
    const e = stretchBasicEnvelopeForMergedPair(geo, mergedFourFaces, list, pairElements)
    expect(e).not.toBeNull()
    expect(e!.matchedConstraintCount).toBe(2)
    expect(e!.lower).toBe(8)
    expect(e!.upper).toBe(40)
    expect(e!.pinConstMm).toBeNull()
  })

  it('uses single minmax constraint for lower and upper', () => {
    const list: FaceConstraint[] = [
      {
        id: 'b',
        type: 'minmax',
        facePair: null,
        elementAId: 'ea',
        elementBId: 'eb',
        minMm: 6,
        maxMm: 40,
      },
    ]
    const e = stretchBasicEnvelopeForMergedPair(geo, mergedFourFaces, list, pairElements)
    expect(e).not.toBeNull()
    expect(e!.matchedConstraintCount).toBe(1)
    expect(e!.lower).toBe(6)
    expect(e!.upper).toBe(40)
    expect(e!.pinConstMm).toBeNull()
  })

  it('sets pin CONST for matching pair', () => {
    const list: FaceConstraint[] = [
      {
        id: 'c',
        type: 'const',
        facePair: null,
        elementAId: 'ea',
        elementBId: 'eb',
        valueMm: 12,
      },
    ]
    const e = stretchBasicEnvelopeForMergedPair(geo, mergedFourFaces, list, pairElements)
    expect(e!.matchedConstraintCount).toBe(1)
    expect(e!.pinConstMm).toBe(12)
  })

  it('matches legacy facePair when selection is two representative faces (like .ecdprt)', () => {
    const list: FaceConstraint[] = [
      { id: 'm', type: 'min', facePair: { a: 0, b: 2 }, valueMm: 3 },
    ]
    const mergedLegacy = [0, 2] as const
    const e = stretchBasicEnvelopeForMergedPair(geo, mergedLegacy, list, [])
    expect(e!.matchedConstraintCount).toBe(1)
    expect(e!.lower).toBe(3)
  })

  it('does not match constraint tied to another element pair', () => {
    const list: FaceConstraint[] = [
      {
        id: 'm',
        type: 'min',
        facePair: null,
        elementAId: 'xa',
        elementBId: 'xb',
        valueMm: 5,
      },
    ]
    const e = stretchBasicEnvelopeForMergedPair(geo, mergedFourFaces, list, pairElements)
    expect(e!.matchedConstraintCount).toBe(0)
  })
})

describe('stretchTargetLockedViolationError', () => {
  it('returns null when raw matches resolved', () => {
    expect(stretchTargetLockedViolationError(10, 10, null)).toBeNull()
  })

  it('maps CONST pin to lockedExact', () => {
    const env = stretchBasicEnvelopeForMergedPair(geometryTwoParallelPatches(10), mergedFourFaces, [], pairElements)!
    const withConst = { ...env, pinConstMm: 12, matchedConstraintCount: 1 }
    expect(stretchTargetLockedViolationError(20, 12, withConst)).toBe('lockedExact')
  })

  it('maps clamp-up to lockedMin and clamp-down to lockedMax', () => {
    expect(stretchTargetLockedViolationError(5, 20, null)).toBe('lockedMin')
    expect(stretchTargetLockedViolationError(50, 8, null)).toBe('lockedMax')
  })

  it('treats near-equal raw and resolved as no violation', () => {
    expect(stretchTargetLockedViolationError(10, 10 + 1e-5, null)).toBeNull()
  })
})

describe('clampStretchTargetMmForBasicConstraints', () => {
  const geo = geometryTwoParallelPatches(10)

  const minPair: FaceConstraint[] = [
    {
      id: 'm',
      type: 'min',
      facePair: null,
      elementAId: 'ea',
      elementBId: 'eb',
      valueMm: 20,
    },
  ]

  it('does not clamp when locks disabled', () => {
    const r = clampStretchTargetMmForBasicConstraints({
      geometry: geo,
      mergedFaces: mergedFourFaces,
      rawTargetMm: 5,
      faceConstraints: minPair,
      modelElements: pairElements,
      constraintsLocked: false,
    })
    expect(r).toEqual({ targetMm: 5, adjusted: false })
  })

  it('does not clamp when faceConstraints empty', () => {
    const r = clampStretchTargetMmForBasicConstraints({
      geometry: geo,
      mergedFaces: mergedFourFaces,
      rawTargetMm: 5,
      faceConstraints: [],
      modelElements: pairElements,
      constraintsLocked: true,
    })
    expect(r.adjusted).toBe(false)
  })

  it('pins to CONST value when matched', () => {
    const list: FaceConstraint[] = [
      {
        id: 'c',
        type: 'const',
        facePair: null,
        elementAId: 'ea',
        elementBId: 'eb',
        valueMm: 15,
      },
    ]
    const r = clampStretchTargetMmForBasicConstraints({
      geometry: geo,
      mergedFaces: mergedFourFaces,
      rawTargetMm: 99,
      faceConstraints: list,
      modelElements: pairElements,
      constraintsLocked: true,
    })
    expect(r.targetMm).toBe(15)
    expect(r.adjusted).toBe(true)
  })

  it('clamps down to MAX when matched', () => {
    const list: FaceConstraint[] = [
      {
        id: 'x',
        type: 'max',
        facePair: null,
        elementAId: 'ea',
        elementBId: 'eb',
        valueMm: 8,
      },
    ]
    const r = clampStretchTargetMmForBasicConstraints({
      geometry: geo,
      mergedFaces: mergedFourFaces,
      rawTargetMm: 50,
      faceConstraints: list,
      modelElements: pairElements,
      constraintsLocked: true,
    })
    expect(r.targetMm).toBe(8)
    expect(r.adjusted).toBe(true)
  })

  it('clamps inside MINMAX when matched', () => {
    const list: FaceConstraint[] = [
      {
        id: 'b',
        type: 'minmax',
        facePair: null,
        elementAId: 'ea',
        elementBId: 'eb',
        minMm: 10,
        maxMm: 30,
      },
    ]
    const high = clampStretchTargetMmForBasicConstraints({
      geometry: geo,
      mergedFaces: mergedFourFaces,
      rawTargetMm: 99,
      faceConstraints: list,
      modelElements: pairElements,
      constraintsLocked: true,
    })
    expect(high.targetMm).toBe(30)
    expect(high.adjusted).toBe(true)

    const low = clampStretchTargetMmForBasicConstraints({
      geometry: geo,
      mergedFaces: mergedFourFaces,
      rawTargetMm: 5,
      faceConstraints: list,
      modelElements: pairElements,
      constraintsLocked: true,
    })
    expect(low.targetMm).toBe(10)
    expect(low.adjusted).toBe(true)
  })

  it('clamps up to MIN when matched', () => {
    const r = clampStretchTargetMmForBasicConstraints({
      geometry: geo,
      mergedFaces: mergedFourFaces,
      rawTargetMm: 4,
      faceConstraints: minPair,
      modelElements: pairElements,
      constraintsLocked: true,
    })
    expect(r.targetMm).toBe(20)
    expect(r.adjusted).toBe(true)
  })
})
