import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import type { FaceConstraint, FaceConstraintType } from './model'
import { mergeTrianglesForPreparedElementPair } from '../part-constraints/mergeFacesForPreparedElementPair'

export type DimensionSlot = 0 | 1 | 2

type BasicDirectionalConstraintType = 'min' | 'max' | 'minmax' | 'const'

const BASIC_DIRECTIONAL_TYPES = new Set<FaceConstraintType>(['min', 'max', 'minmax', 'const'])
const FULL_DIMENSION_TYPES = new Set<FaceConstraintType>(['profil', 'panel', 'block'])

function absMaxIndex3(x: number, y: number, z: number): DimensionSlot {
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  const az = Math.abs(z)
  if (ax >= ay && ax >= az) return 0
  if (ay >= az) return 1
  return 2
}

export function axisToDimensionSlot(axis: { x: number; y: number; z: number }): DimensionSlot {
  return absMaxIndex3(axis.x, axis.y, axis.z)
}

function readVertex(geometry: BufferGeometry, vertexIndex: number): { x: number; y: number; z: number } | null {
  const pos = geometry.getAttribute('position')
  if (!pos || vertexIndex < 0 || vertexIndex >= pos.count) return null
  return { x: pos.getX(vertexIndex), y: pos.getY(vertexIndex), z: pos.getZ(vertexIndex) }
}

function edgePairSlot(geometry: BufferGeometry, va: number, vb: number): DimensionSlot | null {
  const a = readVertex(geometry, va)
  const b = readVertex(geometry, vb)
  if (!a || !b) return null
  return absMaxIndex3(b.x - a.x, b.y - a.y, b.z - a.z)
}

function directionalConstraintType(type: FaceConstraintType): type is BasicDirectionalConstraintType {
  return BASIC_DIRECTIONAL_TYPES.has(type)
}

function fullConstraintType(type: FaceConstraintType): boolean {
  return FULL_DIMENSION_TYPES.has(type)
}

function resolveDirectionalConstraintSlot(
  geometry: BufferGeometry,
  modelElements: readonly PreparedModelElement[],
  c: FaceConstraint,
): DimensionSlot | null {
  if (!directionalConstraintType(c.type)) return null
  if (c.type === 'const' && c.edgeVertexPair) {
    return edgePairSlot(geometry, c.edgeVertexPair.va, c.edgeVertexPair.vb)
  }

  const ea = c.elementAId?.trim()
  const eb = c.elementBId?.trim()
  let merged: number[] | null = null
  if (ea && eb) {
    merged = mergeTrianglesForPreparedElementPair(modelElements, ea, eb)
  }
  if (!merged && c.facePair) {
    merged = [c.facePair.a, c.facePair.b]
  }
  if (!merged || merged.length < 2) return null

  const analysis = analyzeTwoFaceStretch(geometry, merged)
  if (!analysis.ok) return null
  return axisToDimensionSlot(analysis.axis)
}

type Occupancy = {
  hasFull: boolean
  occupied: Set<DimensionSlot>
}

export function collectDimensionOccupancy(
  geometry: BufferGeometry,
  modelElements: readonly PreparedModelElement[],
  constraints: readonly FaceConstraint[],
): Occupancy {
  let hasFull = false
  const occupied = new Set<DimensionSlot>()
  for (const c of constraints) {
    if (fullConstraintType(c.type)) {
      hasFull = true
      occupied.add(0)
      occupied.add(1)
      occupied.add(2)
      continue
    }
    const slot = resolveDirectionalConstraintSlot(geometry, modelElements, c)
    if (slot !== null) occupied.add(slot)
  }
  return { hasFull, occupied }
}

export type AddConstraintSlotCheckResult =
  | { ok: true }
  | { ok: false; reason: 'fullConstraintExists' | 'slotAlreadyOccupied' | 'needTwoPlanarGroups' }

export function checkConstraintCanBeAddedByDimensionSlots(params: {
  geometry: BufferGeometry
  modelElements: readonly PreparedModelElement[]
  existing: readonly FaceConstraint[]
  nextType: FaceConstraintType
  nextMergedFaces?: readonly number[]
}): AddConstraintSlotCheckResult {
  const { geometry, modelElements, existing, nextType, nextMergedFaces } = params
  const occupancy = collectDimensionOccupancy(geometry, modelElements, existing)
  if (fullConstraintType(nextType)) {
    return existing.length > 0 ? { ok: false, reason: 'fullConstraintExists' } : { ok: true }
  }
  if (!directionalConstraintType(nextType)) return { ok: true }
  if (occupancy.hasFull) return { ok: false, reason: 'fullConstraintExists' }
  if (!nextMergedFaces || nextMergedFaces.length < 2) return { ok: false, reason: 'needTwoPlanarGroups' }
  const analysis = analyzeTwoFaceStretch(geometry, nextMergedFaces)
  if (!analysis.ok) return { ok: false, reason: 'needTwoPlanarGroups' }
  const slot = axisToDimensionSlot(analysis.axis)
  if (occupancy.occupied.has(slot)) return { ok: false, reason: 'slotAlreadyOccupied' }
  return { ok: true }
}
