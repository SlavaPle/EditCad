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

/** Po ruchu detalu A lub B — detal B (entityB) zostaje związany z A według zapisanej przywiązki. */
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
    const anchorId = mate.entityA.partId
    const drivenId = mate.entityB.partId
    if (input.movedPartId !== anchorId && input.movedPartId !== drivenId) continue
    if (locked?.has(drivenId)) continue

    const driven = partsById.get(drivenId)
    if (!driven) continue

    let seedTransformB = driven.transform
    if (input.movedPartId === anchorId) {
      const anchorBefore = partsBefore.get(anchorId)
      const anchorAfter = partsById.get(anchorId)
      if (anchorBefore && anchorAfter) {
        seedTransformB = applyRigidDeltaToTransform(
          partsBefore.get(drivenId)?.transform ?? driven.transform,
          anchorBefore.transform,
          anchorAfter.transform,
        )
      }
    }

    const nextTransformB = projectMateForAssembly(mate, partsById, input.geometries, seedTransformB)
    if (!nextTransformB) continue

    partsById.set(drivenId, { ...driven, transform: nextTransformB })
  }

  return input.parts.map((part) => partsById.get(part.id) ?? part)
}

export type ReapplyAllAssemblyMatesInput = {
  parts: readonly PreAssemblyProgramPart[]
  mates: readonly AssemblyMate[]
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>
}

/**
 * Po mutacji mates (load / unsuppress / delete) — wymusza projekcję każdego
 * aktywnego mate na detal B, nawet gdy A się nie ruszył.
 * (applyAssemblyMateConstraints przy „ruchu” A na tę samą pose zostawia złe seed B.)
 */
export function reapplyAllAssemblyMates(input: ReapplyAllAssemblyMatesInput): PreAssemblyProgramPart[] {
  let parts = [...input.parts]
  for (const mate of input.mates) {
    if (isMateSuppressed(mate)) continue

    const partsById = new Map(parts.map((part) => [part.id, part]))
    const driven = partsById.get(mate.entityB.partId)
    if (!driven) continue

    const nextTransformB = projectMateForAssembly(
      mate,
      partsById,
      input.geometries,
      driven.transform,
    )
    if (!nextTransformB) continue
    parts = updateProgramPartTransform(parts, mate.entityB.partId, nextTransformB)
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
