import type { BufferGeometry } from 'three'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { updateProgramPartTransform } from '../pre-assembly/preAssemblyProgram'
import type { PhantomTransform } from '../pre-assembly/model'
import type { AssemblyMate } from './model'
import { solveParallelMate } from './parallelMateSolver'

export type ApplyAssemblyMateConstraintsInput = {
  parts: readonly PreAssemblyProgramPart[]
  mates: readonly AssemblyMate[]
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>
  movedPartId: string
  movedTransform: PhantomTransform
}

function solveParallelMateForAssembly(
  mate: AssemblyMate,
  partsById: Map<string, PreAssemblyProgramPart>,
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>,
): PhantomTransform | null {
  if (mate.kind !== 'parallel') return null

  const partA = partsById.get(mate.planeA.partId)
  const partB = partsById.get(mate.planeB.partId)
  const geometryA = geometries[mate.planeA.partId]
  const geometryB = geometries[mate.planeB.partId]
  if (!partA || !partB || !geometryA || !geometryB) return null

  const solved = solveParallelMate({
    planeA: mate.planeA,
    planeB: mate.planeB,
    geometryA,
    geometryB,
    transformA: partA.transform,
    transformB: partB.transform,
    alignment: mate.alignment,
    offsetMm: mate.offsetMm,
  })
  return solved.ok ? solved.transform : null
}

/** Po ruchu detalu A lub B — detal B (planeB) zostaje związany z A według zapisanej przywiązki. */
export function applyAssemblyMateConstraints(
  input: ApplyAssemblyMateConstraintsInput,
): PreAssemblyProgramPart[] {
  if (input.mates.length === 0) {
    return updateProgramPartTransform(input.parts, input.movedPartId, input.movedTransform)
  }

  const partsById = new Map(
    updateProgramPartTransform(input.parts, input.movedPartId, input.movedTransform).map((part) => [
      part.id,
      part,
    ]),
  )

  for (const mate of input.mates) {
    const anchorId = mate.planeA.partId
    const drivenId = mate.planeB.partId
    if (input.movedPartId !== anchorId && input.movedPartId !== drivenId) continue

    const nextTransformB = solveParallelMateForAssembly(mate, partsById, input.geometries)
    if (!nextTransformB) continue

    const driven = partsById.get(drivenId)
    if (!driven) continue
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
    const anchor = parts.find((part) => part.id === mate.planeA.partId)
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
    (mate) => partIds.has(mate.planeA.partId) && partIds.has(mate.planeB.partId),
  )
}
