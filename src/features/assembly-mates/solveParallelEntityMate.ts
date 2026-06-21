import type { BufferGeometry } from 'three'
import type { PhantomTransform } from '../pre-assembly/model'
import type { MateAlignment, MateEntityRef } from './model'
import { projectMateConstraint, type MateProjectReason } from './constraint/projectMateConstraint'

export type ParallelEntityMateSolverReason = MateProjectReason

export type ParallelEntityMateSolverInput = {
  entityA: MateEntityRef
  entityB: MateEntityRef
  geometryA: BufferGeometry
  geometryB: BufferGeometry
  transformA: PhantomTransform
  transformB: PhantomTransform
  alignment: MateAlignment
  offsetMm: number
}

export type ParallelEntityMateSolverResult =
  | { ok: true; transform: PhantomTransform }
  | { ok: false; reason: ParallelEntityMateSolverReason }

/** @deprecated Użyj projectMateConstraint */
export function solveParallelEntityMate(
  input: ParallelEntityMateSolverInput,
): ParallelEntityMateSolverResult {
  return projectMateConstraint(input)
}
