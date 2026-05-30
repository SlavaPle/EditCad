import type { PhantomTransform } from '../model'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'

export function cloneProgramPartTransform(transform: PhantomTransform): PhantomTransform {
  return {
    positionMm: [...transform.positionMm] as PhantomTransform['positionMm'],
    rotationDeg: [...transform.rotationDeg] as PhantomTransform['rotationDeg'],
  }
}

/**
 * Synchronizuje mapę transformów z listą detali: inicjuje nowe id, usuwa brakujące.
 * Nie nadpisuje istniejących wpisów (np. po dragu).
 */
export function syncProgramPartTransformsMap(
  parts: readonly PreAssemblyProgramPart[],
  map: Map<string, PhantomTransform>,
): void {
  const partIds = new Set(parts.map((part) => part.id))
  for (const part of parts) {
    if (!map.has(part.id)) {
      map.set(part.id, cloneProgramPartTransform(part.transform))
    }
  }
  for (const id of [...map.keys()]) {
    if (!partIds.has(id)) {
      map.delete(id)
    }
  }
}
