import type { AssemblyMate, MateEntityRef } from '../assembly-mates/model'
import type { MateEntityHighlights } from '../assembly-mates/matePlaneFaceOverlay'

/** Podświetlenie encji mates z drzewa (bez wymogu otwartego popup). */
export function highlightsFromMateEntities(
  entityA: MateEntityRef | null | undefined,
  entityB: MateEntityRef | null | undefined,
): MateEntityHighlights | null {
  if (!entityA && !entityB) return null
  return {
    entityA: entityA ?? null,
    entityB: entityB ?? null,
  }
}

export function highlightsFromAssemblyMate(mate: AssemblyMate | null | undefined): MateEntityHighlights | null {
  if (!mate) return null
  return highlightsFromMateEntities(mate.entityA, mate.entityB)
}

/** Popup ma pierwszeństwo nad wyborem w drzewie. */
export function mergeMateEntityHighlights(
  popupHighlights: MateEntityHighlights | null,
  treeHighlights: MateEntityHighlights | null,
): MateEntityHighlights | null {
  return popupHighlights ?? treeHighlights
}
