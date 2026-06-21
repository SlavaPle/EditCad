import type { BufferGeometry } from 'three'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { mateDraftApply, type MateDraftSession } from './mateDraft'
import { solveParallelMate, type ParallelMateSolverReason } from './parallelMateSolver'
import { validateParallelMateDraft, type ParallelMateDraft } from './store'

export type ExecuteMateApplyInput = {
  session: MateDraftSession
  draft: ParallelMateDraft
  programParts: readonly PreAssemblyProgramPart[]
  programPartGeometries: Readonly<Record<string, BufferGeometry>>
}

export type ExecuteMateApplyReason =
  | 'notIdle'
  | 'invalidDraft'
  | 'missingGeometry'
  | 'missingPart'
  | 'solverFailed'
  | 'applyFailed'

export type ExecuteMateApplyResult =
  | {
      ok: true
      nextSession: MateDraftSession
      movingPartId: string
      transform: PreAssemblyProgramPart['transform']
    }
  | { ok: false; reason: ExecuteMateApplyReason; solverReason?: ParallelMateSolverReason }

export function executeMateApply(input: ExecuteMateApplyInput): ExecuteMateApplyResult {
  const { session, draft, programParts, programPartGeometries } = input

  const validation = validateParallelMateDraft(draft)
  if (!validation.ok) {
    return { ok: false, reason: 'invalidDraft' }
  }

  const { planeA, planeB } = draft
  if (!planeA || !planeB) {
    return { ok: false, reason: 'invalidDraft' }
  }

  const geometryA = programPartGeometries[planeA.partId]
  const geometryB = programPartGeometries[planeB.partId]
  if (!geometryA || !geometryB) {
    return { ok: false, reason: 'missingGeometry' }
  }

  const partA = programParts.find((p) => p.id === planeA.partId)
  const partB = programParts.find((p) => p.id === planeB.partId)
  if (!partA || !partB) {
    return { ok: false, reason: 'missingPart' }
  }

  const solved = solveParallelMate({
    planeA,
    planeB,
    geometryA,
    geometryB,
    transformA: partA.transform,
    transformB: partB.transform,
    alignment: draft.alignment,
    offsetMm: draft.offsetMm,
  })

  if (!solved.ok) {
    return { ok: false, reason: 'solverFailed', solverReason: solved.reason }
  }

  if (session.applyState === 'idle') {
    const applied = mateDraftApply({ ...session, draft }, partB.transform)
    if (!applied.ok) {
      return { ok: false, reason: 'applyFailed' }
    }
    return {
      ok: true,
      nextSession: applied.session,
      movingPartId: planeB.partId,
      transform: solved.transform,
    }
  }

  return {
    ok: true,
    nextSession: { ...session, draft },
    movingPartId: planeB.partId,
    transform: solved.transform,
  }
}
