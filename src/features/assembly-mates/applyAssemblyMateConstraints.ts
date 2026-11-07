import type { BufferGeometry } from 'three'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { updateProgramPartTransform } from '../pre-assembly/preAssemblyProgram'
import type { PhantomTransform } from '../pre-assembly/model'
import type { AssemblyMate } from './model'
import { isMateSuppressed, signedMateOffsetMm } from './model'
import { applyRigidDeltaToTransform } from './constraint/transformMath'
import { projectMateConstraint } from './constraint/projectMateConstraint'
import { projectOrientMateConstraint } from './constraint/projectOrientMateConstraint'

export type ApplyAssemblyMateConstraintsInput = {
  parts: readonly PreAssemblyProgramPart[]
  mates: readonly AssemblyMate[]
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>
  movedPartId: string
  movedTransform: PhantomTransform
  /** Zablokowane detale nie zmieniają pozycji (ani jako moved, ani jako driven). */
  lockedPartIds?: ReadonlySet<string>
}

/** Kotwica / napędzany z uwzględnieniem lock — gdy B zablokowane, napędzaj A. */
export function mateDriveRoles(
  mate: AssemblyMate,
  lockedPartIds?: ReadonlySet<string>,
): { anchorId: string; drivenId: string; swapped: boolean } | null {
  const aId = mate.entityA.partId
  const bId = mate.entityB.partId
  const aLocked = lockedPartIds?.has(aId) ?? false
  const bLocked = lockedPartIds?.has(bId) ?? false
  if (aLocked && bLocked) return null
  if (bLocked && !aLocked) {
    return { anchorId: bId, drivenId: aId, swapped: true }
  }
  return { anchorId: aId, drivenId: bId, swapped: false }
}

/** Mate z zamienionymi entity (i flipped), żeby solver zawsze ruszał „B”. */
export function mateWithSwappedDrive(mate: AssemblyMate): AssemblyMate {
  const entityA = mate.entityB
  const entityB = mate.entityA
  if (mate.kind === 'parallel') {
    const next: AssemblyMate = {
      ...mate,
      entityA,
      entityB,
    }
    if (mate.flipped) {
      const { flipped: _removed, ...rest } = next
      return rest
    }
    return { ...next, flipped: true }
  }
  if (mate.kind === 'perpendicular') {
    return { ...mate, entityA, entityB, flipped: !mate.flipped }
  }
  return { ...mate, entityA, entityB }
}

function projectMateForAssembly(
  mate: AssemblyMate,
  partsById: Map<string, PreAssemblyProgramPart>,
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>,
  seedTransformB?: PhantomTransform,
): PhantomTransform | null {
  const partA = partsById.get(mate.entityA.partId)
  const partB = partsById.get(mate.entityB.partId)
  const geometryA = geometries[mate.entityA.partId]
  const geometryB = geometries[mate.entityB.partId]
  if (!partA || !partB || !geometryA || !geometryB) return null

  if (mate.kind === 'parallel') {
    const projected = projectMateConstraint({
      entityA: mate.entityA,
      entityB: mate.entityB,
      geometryA,
      geometryB,
      transformA: partA.transform,
      transformB: seedTransformB ?? partB.transform,
      alignment: mate.alignment,
      offsetMm: signedMateOffsetMm(mate.offsetMm, mate.flipped),
    })
    return projected.ok ? projected.transform : null
  }

  const projected = projectOrientMateConstraint({
    kind: mate.kind,
    entityA: mate.entityA,
    entityB: mate.entityB,
    geometryA,
    geometryB,
    transformA: partA.transform,
    transformB: seedTransformB ?? partB.transform,
    flipped: mate.kind === 'perpendicular' ? mate.flipped : false,
    alignment: mate.kind === 'angular' ? mate.alignment : undefined,
    angleDeg: mate.kind === 'angular' ? mate.angleDeg : undefined,
  })
  return projected.ok ? projected.transform : null
}

function projectDrivenTransform(
  mate: AssemblyMate,
  swapped: boolean,
  partsById: Map<string, PreAssemblyProgramPart>,
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>,
  seedDriven?: PhantomTransform,
): PhantomTransform | null {
  const projectMate = swapped ? mateWithSwappedDrive(mate) : mate
  return projectMateForAssembly(projectMate, partsById, geometries, seedDriven)
}

/** Po ruchu detalu A lub B — detal napędzany zostaje związany z kotwicą. */
export function applyAssemblyMateConstraints(
  input: ApplyAssemblyMateConstraintsInput,
): PreAssemblyProgramPart[] {
  const locked = input.lockedPartIds
  if (locked?.has(input.movedPartId)) {
    return [...input.parts]
  }

  if (input.mates.length === 0) {
    return updateProgramPartTransform(input.parts, input.movedPartId, input.movedTransform)
  }

  const partsBefore = new Map(input.parts.map((part) => [part.id, part]))
  const partsById = new Map(
    updateProgramPartTransform(input.parts, input.movedPartId, input.movedTransform).map((part) => [
      part.id,
      part,
    ]),
  )

  for (const mate of input.mates) {
    if (isMateSuppressed(mate)) continue
    const roles = mateDriveRoles(mate, locked)
    if (!roles) continue
    const { anchorId, drivenId, swapped } = roles
    if (input.movedPartId !== anchorId && input.movedPartId !== drivenId) continue
    if (locked?.has(drivenId)) continue

    const driven = partsById.get(drivenId)
    if (!driven) continue

    let seedDriven = driven.transform
    if (input.movedPartId === anchorId) {
      const anchorBefore = partsBefore.get(anchorId)
      const anchorAfter = partsById.get(anchorId)
      if (anchorBefore && anchorAfter) {
        seedDriven = applyRigidDeltaToTransform(
          partsBefore.get(drivenId)?.transform ?? driven.transform,
          anchorBefore.transform,
          anchorAfter.transform,
        )
      }
    }

    const nextTransform = projectDrivenTransform(
      mate,
      swapped,
      partsById,
      input.geometries,
      seedDriven,
    )
    if (!nextTransform) continue

    partsById.set(drivenId, { ...driven, transform: nextTransform })
  }

  return input.parts.map((part) => partsById.get(part.id) ?? part)
}

export type ReapplyAllAssemblyMatesInput = {
  parts: readonly PreAssemblyProgramPart[]
  mates: readonly AssemblyMate[]
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>
  /** Zablokowane detale nie zmieniają pozycji przy reapply. */
  lockedPartIds?: ReadonlySet<string>
}

/**
 * Po mutacji mates (load / unsuppress / delete) — wymusza projekcję każdego
 * aktywnego mate na detal napędzany, nawet gdy kotwica się nie ruszyła.
 */
export function reapplyAllAssemblyMates(input: ReapplyAllAssemblyMatesInput): PreAssemblyProgramPart[] {
  const locked = input.lockedPartIds
  let parts = [...input.parts]
  for (const mate of input.mates) {
    if (isMateSuppressed(mate)) continue

    const roles = mateDriveRoles(mate, locked)
    if (!roles) continue
    const { drivenId, swapped } = roles
    if (locked?.has(drivenId)) continue

    const partsById = new Map(parts.map((part) => [part.id, part]))
    const driven = partsById.get(drivenId)
    if (!driven) continue

    const nextTransform = projectDrivenTransform(
      mate,
      swapped,
      partsById,
      input.geometries,
      driven.transform,
    )
    if (!nextTransform) continue
    parts = updateProgramPartTransform(parts, drivenId, nextTransform)
  }
  return parts
}

export function filterAssemblyMatesForPartIds(
  mates: readonly AssemblyMate[],
  partIds: ReadonlySet<string>,
): AssemblyMate[] {
  return mates.filter(
    (mate) => partIds.has(mate.entityA.partId) && partIds.has(mate.entityB.partId),
  )
}
