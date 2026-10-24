import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import { resolveSizeStepMm, sizeMmForUi } from '../app-settings'
import type { FaceConstraint, FaceConstraintType } from '../face-constraints/model'
import {
  axisToDimensionSlot,
  collectDimensionOccupancy,
  type DimensionSlot,
} from '../face-constraints/limitDimensionSlots'
import { mergeTrianglesForPreparedElementPair } from '../part-constraints/mergeFacesForPreparedElementPair'
import { findAxisExtremeFacePatches } from './findAxisExtremeFacePatches'
import type { DocumentTreeAxis, SizeNodeLockReason, SizeNodeStatus } from './model'

const AXIS_TO_SLOT: Record<DocumentTreeAxis, DimensionSlot> = {
  x: 0,
  y: 1,
  z: 2,
}

const PURE_WORLD_ALIGN = 0.95

export type SizeNodeBinding = {
  slot: DimensionSlot
  editable: boolean
  lockReason: SizeNodeLockReason
  status: SizeNodeStatus
  constraintId: string | null
  displayName: string | null
  faceIndices: number[]
  sizeMm: number | null
  limitMinMm: number | null
  limitMaxMm: number | null
}

export function limitBoundsFromConstraint(
  c: FaceConstraint | null | undefined,
): { limitMinMm: number | null; limitMaxMm: number | null } {
  if (!c) return { limitMinMm: null, limitMaxMm: null }
  if (c.type === 'minmax') {
    return {
      limitMinMm: Number.isFinite(c.minMm) ? c.minMm : null,
      limitMaxMm: Number.isFinite(c.maxMm) ? c.maxMm : null,
    }
  }
  if (c.type === 'min') {
    return {
      limitMinMm: Number.isFinite(c.valueMm) ? c.valueMm : null,
      limitMaxMm: null,
    }
  }
  if (c.type === 'max' || c.type === 'const') {
    return {
      limitMinMm: null,
      limitMaxMm: Number.isFinite(c.valueMm) ? c.valueMm : null,
    }
  }
  return { limitMinMm: null, limitMaxMm: null }
}

function withBounds(
  binding: Omit<SizeNodeBinding, 'limitMinMm' | 'limitMaxMm'>,
  c: FaceConstraint | null | undefined,
): SizeNodeBinding {
  const bounds = limitBoundsFromConstraint(c)
  return { ...binding, ...bounds }
}

function constraintFaces(
  modelElements: readonly PreparedModelElement[],
  c: FaceConstraint,
): number[] | null {
  const ea = c.elementAId?.trim()
  const eb = c.elementBId?.trim()
  if (ea && eb) {
    const merged = mergeTrianglesForPreparedElementPair(modelElements, ea, eb)
    if (merged && merged.length >= 2) return merged
  }
  if (c.facePair) return [c.facePair.a, c.facePair.b]
  return null
}

function constraintSlot(
  geometry: BufferGeometry,
  modelElements: readonly PreparedModelElement[],
  c: FaceConstraint,
): DimensionSlot | null {
  if (c.type === 'block' || c.type === 'panel' || c.type === 'profil') return null
  const faces = constraintFaces(modelElements, c)
  if (!faces || faces.length < 2) return null
  const analysis = analyzeTwoFaceStretch(geometry, faces)
  if (!analysis.ok) return null
  return axisToDimensionSlot(analysis.axis)
}

/**
 * Constraint jest „custom” w drzewie tylko gdy oś nie jest czysto światowa (X/Y/Z).
 * Same displayName na osi kanonicznej NIE tworzy osobnego węzła — zostaje na X/Y/Z.
 */
export function isCustomSizeConstraint(
  geometry: BufferGeometry,
  modelElements: readonly PreparedModelElement[],
  c: FaceConstraint,
): boolean {
  if (c.type === 'block' || c.type === 'panel' || c.type === 'profil') return false
  if (c.type !== 'min' && c.type !== 'max' && c.type !== 'minmax' && c.type !== 'const') return false
  const faces = constraintFaces(modelElements, c)
  if (!faces || faces.length < 2) return false
  const analysis = analyzeTwoFaceStretch(geometry, faces)
  if (!analysis.ok) return false
  const slot = axisToDimensionSlot(analysis.axis)
  const len = Math.hypot(analysis.axis.x, analysis.axis.y, analysis.axis.z) || 1
  const unit = {
    x: analysis.axis.x / len,
    y: analysis.axis.y / len,
    z: analysis.axis.z / len,
  }
  const dominant =
    slot === 0 ? Math.abs(unit.x) : slot === 1 ? Math.abs(unit.y) : Math.abs(unit.z)
  return dominant < PURE_WORLD_ALIGN
}

function statusFromType(type: FaceConstraintType): SizeNodeStatus {
  switch (type) {
    case 'min':
      return 'min'
    case 'max':
      return 'max'
    case 'minmax':
      return 'minmax'
    case 'const':
      return 'const'
    case 'block':
      return 'block'
    case 'panel':
      return 'panel'
    case 'profil':
      return 'profil'
    default:
      return 'free'
  }
}

export function resolveCanonicalSizeNodeBinding(params: {
  geometry: BufferGeometry | null
  modelElements: readonly PreparedModelElement[]
  constraints: readonly FaceConstraint[]
  axis: DocumentTreeAxis
  sizeMm: number | null | undefined
}): SizeNodeBinding {
  const slot = AXIS_TO_SLOT[params.axis]
  const empty = withBounds(
    {
      slot,
      editable: false,
      lockReason: 'noFaces',
      status: 'noFaces',
      constraintId: null,
      displayName: null,
      faceIndices: [],
      sizeMm: params.sizeMm ?? null,
    },
    null,
  )

  const geometry = params.geometry
  if (!geometry) return empty

  const occupancy = collectDimensionOccupancy(geometry, params.modelElements, params.constraints)
  if (occupancy.hasFull) {
    const full = params.constraints.find(
      (c) => c.type === 'block' || c.type === 'panel' || c.type === 'profil',
    )
    return withBounds(
      {
        slot,
        editable: false,
        lockReason: full?.type === 'block' ? 'block' : 'fullConstraint',
        status: full ? statusFromType(full.type) : 'block',
        constraintId: full?.id ?? null,
        displayName: null,
        faceIndices: [],
        sizeMm: params.sizeMm ?? null,
      },
      null,
    )
  }

  const onSlot = params.constraints.filter((c) => {
    if (c.type === 'block' || c.type === 'panel' || c.type === 'profil') return false
    return constraintSlot(geometry, params.modelElements, c) === slot
  })

  const customs = onSlot.filter((c) => isCustomSizeConstraint(geometry, params.modelElements, c))
  const canonical = onSlot.find((c) => !isCustomSizeConstraint(geometry, params.modelElements, c))

  if (customs.length > 0 && !canonical) {
    const faces =
      constraintFaces(params.modelElements, customs[0]!) ??
      findAxisExtremeFacePatches(geometry, params.axis)?.faceIndices ??
      []
    // Limity custom dotyczą szczeliny custom — nie min/max osi Y/Z
    return withBounds(
      {
        slot,
        editable: false,
        lockReason: 'customConflict',
        status: 'lockedByCustom',
        constraintId: customs[0]!.id,
        displayName: customs[0]!.displayName?.trim() || null,
        faceIndices: faces,
        sizeMm: params.sizeMm ?? null,
      },
      null,
    )
  }

  const bound = canonical ?? null
  let faceIndices: number[] = []
  if (bound) {
    faceIndices = constraintFaces(params.modelElements, bound) ?? []
  }
  if (faceIndices.length < 2) {
    faceIndices = findAxisExtremeFacePatches(geometry, params.axis)?.faceIndices ?? []
  }

  if (faceIndices.length < 2) {
    return withBounds({ ...empty, faceIndices: [] }, null)
  }

  if (bound?.type === 'const') {
    return withBounds(
      {
        slot,
        editable: false,
        lockReason: 'const',
        status: 'const',
        constraintId: bound.id,
        displayName: bound.displayName?.trim() || null,
        faceIndices,
        sizeMm: params.sizeMm ?? null,
      },
      bound,
    )
  }

  if (customs.length > 0) {
    return withBounds(
      {
        slot,
        editable: false,
        lockReason: 'customConflict',
        status: 'lockedByCustom',
        constraintId: bound?.id ?? customs[0]!.id,
        displayName: bound?.displayName?.trim() || null,
        faceIndices,
        sizeMm: params.sizeMm ?? null,
      },
      bound,
    )
  }

  return withBounds(
    {
      slot,
      editable: true,
      lockReason: 'none',
      status: bound ? statusFromType(bound.type) : 'free',
      constraintId: bound?.id ?? null,
      displayName: bound?.displayName?.trim() || null,
      faceIndices,
      sizeMm: params.sizeMm ?? null,
    },
    bound,
  )
}

export function resolveCustomSizeNodeBinding(params: {
  geometry: BufferGeometry | null
  modelElements: readonly PreparedModelElement[]
  constraint: FaceConstraint
}): SizeNodeBinding {
  const geometry = params.geometry
  const slotFallback: DimensionSlot = 0
  if (!geometry) {
    return withBounds(
      {
        slot: slotFallback,
        editable: false,
        lockReason: 'noFaces',
        status: 'noFaces',
        constraintId: params.constraint.id,
        displayName: params.constraint.displayName?.trim() || null,
        faceIndices: [],
        sizeMm: null,
      },
      params.constraint,
    )
  }

  const faces = constraintFaces(params.modelElements, params.constraint) ?? []
  const analysis = faces.length >= 2 ? analyzeTwoFaceStretch(geometry, faces) : null
  const slot =
    analysis && analysis.ok ? axisToDimensionSlot(analysis.axis) : slotFallback
  const sizeMm =
    analysis && analysis.ok ? sizeMmForUi(analysis.gapMm, resolveSizeStepMm) : null

  if (faces.length < 2) {
    return withBounds(
      {
        slot,
        editable: false,
        lockReason: 'noFaces',
        status: 'noFaces',
        constraintId: params.constraint.id,
        displayName: params.constraint.displayName?.trim() || null,
        faceIndices: [],
        sizeMm: null,
      },
      params.constraint,
    )
  }

  if (params.constraint.type === 'const') {
    return withBounds(
      {
        slot,
        editable: false,
        lockReason: 'const',
        status: 'const',
        constraintId: params.constraint.id,
        displayName: params.constraint.displayName?.trim() || null,
        faceIndices: faces,
        sizeMm,
      },
      params.constraint,
    )
  }

  return withBounds(
    {
      slot,
      editable: true,
      lockReason: 'none',
      status: statusFromType(params.constraint.type),
      constraintId: params.constraint.id,
      displayName: params.constraint.displayName?.trim() || null,
      faceIndices: faces,
      sizeMm,
    },
    params.constraint,
  )
}
