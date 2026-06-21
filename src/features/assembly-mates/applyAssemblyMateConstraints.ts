import type { BufferGeometry } from 'three'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { updateProgramPartTransform } from '../pre-assembly/preAssemblyProgram'
import type { PhantomTransform } from '../pre-assembly/model'
import type { AssemblyMate } from './model'
import { applyRigidDeltaToTransform } from './constraint/transformMath'
import { projectMateConstraint } from './constraint/projectMateConstraint'

export type ApplyAssemblyMateConstraintsInput = {
  parts: readonly PreAssemblyProgramPart[]
  mates: readonly AssemblyMate[]
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>
  movedPartId: string
  movedTransform: PhantomTransform
}

function projectMateForAssembly(
  mate: AssemblyMate,
  partsById: Map<string, PreAssemblyProgramPart>,
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>,
  seedTransformB?: PhantomTransform,
): PhantomTransform | null {
  if (mate.kind !== 'parallel') return null

  const partA = partsById.get(mate.entityA.partId)
  const partB = partsById.get(mate.entityB.partId)
  const geometryA = geometries[mate.entityA.partId]
  const geometryB = geometries[mate.entityB.partId]
  if (!partA || !partB || !geometryA || !geometryB) return null

  const projected = projectMateConstraint({
    entityA: mate.entityA,
    entityB: mate.entityB,
    geometryA,
    geometryB,
    transformA: partA.transform,
    transformB: seedTransformB ?? partB.transform,
    alignment: mate.alignment,
    offsetMm: mate.offsetMm,
  })
  return projected.ok ? projected.transform : null
}

/** Po ruchu detalu A lub B — detal B (entityB) zostaje związany z A według zapisanej przywiązki. */
export function applyAssemblyMateConstraints(
  input: ApplyAssemblyMateConstraintsInput,
): PreAssemblyProgramPart[] {
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
    const anchorId = mate.entityA.partId
    const drivenId = mate.entityB.partId
    if (input.movedPartId !== anchorId && input.movedPartId !== drivenId) continue

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

/** Po wczytaniu .ecdasm — odtwarza pozycje detali B z zapisanych mates[]. */
export function reapplyAllAssemblyMates(input: ReapplyAllAssemblyMatesInput): PreAssemblyProgramPart[] {
  let parts = [...input.parts]
  for (const mate of input.mates) {
    if (mate.kind !== 'parallel') continue
    const anchor = parts.find((part) => part.id === mate.entityA.partId)
    if (!anchor) continue
    parts = applyAssemblyMateConstraints({
      parts,
      mates: [mate],
      geometries: input.geometries,
      movedPartId: anchor.id,
      movedTransform: anchor.transform,
    })
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
