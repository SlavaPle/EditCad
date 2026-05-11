import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { partitionSelectionIntoCoplanarPatches } from './facePlaneSelection'

export type FrozenPlanePairCaptureFailureReason = 'needTwoPlanarGroups'

export type CaptureFrozenPlanePairResult =
  | {
      ok: true
      elementAId: string
      elementBId: string
      elements: readonly PreparedModelElement[]
    }
  | { ok: false; reason: FrozenPlanePairCaptureFailureReason }

/**
 * Z bieżącego zaznaczenia trójkątów: dwie koplanarne łaty → dwa elementy przygotowane (PROFIL, PANEL, później BLOCK).
 */
export function captureFrozenPlanePairFromTriangles(
  model: BufferGeometry,
  triangleSelection: readonly number[],
  options: { idPrefix: string; slotTag: string },
): CaptureFrozenPlanePairResult {
  const patches = partitionSelectionIntoCoplanarPatches(model, triangleSelection)
  if (patches.length !== 2) {
    return { ok: false, reason: 'needTwoPlanarGroups' }
  }
  const pid = Date.now()
  const rand = Math.random().toString(36).slice(2, 6)
  const elementAId = `${options.idPrefix}-${pid}-${rand}-${options.slotTag}-a`
  const elementBId = `${options.idPrefix}-${pid}-${rand}-${options.slotTag}-b`
  const ua = [...patches[0]!]
  const ub = [...patches[1]!]
  ua.sort((x, y) => x - y)
  ub.sort((x, y) => x - y)
  const elements: PreparedModelElement[] = [
    { id: elementAId, faceIndices: ua },
    { id: elementBId, faceIndices: ub },
  ]
  return { ok: true, elementAId, elementBId, elements }
}
