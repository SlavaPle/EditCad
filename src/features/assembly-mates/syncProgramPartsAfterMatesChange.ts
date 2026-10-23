import type { BufferGeometry } from 'three'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import type { AssemblyMate } from './model'
import { reapplyAllAssemblyMates } from './applyAssemblyMateConstraints'

/**
 * Globalna reguła EditCad:
 * Po każdej zmianie listy mates (add / remove / suppress / unsuppress / load)
 * natychmiast przelicz pozycje detali programu z aktywnych (niesuppressed) mates.
 *
 * Nie pomijaj tego kroku w App — używaj syncProgramPartsAfterMatesChange
 * (lub commitAssemblyMates w App, który ją wywołuje).
 */
export const MATES_CHANGE_MUST_SYNC_PROGRAM_PARTS = true as const

export type SyncProgramPartsAfterMatesChangeInput = {
  parts: readonly PreAssemblyProgramPart[]
  mates: readonly AssemblyMate[]
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>
}

/** Jedyny punkt synchronizacji pozycji detali po mutacji mates[]. */
export function syncProgramPartsAfterMatesChange(
  input: SyncProgramPartsAfterMatesChangeInput,
): PreAssemblyProgramPart[] {
  return reapplyAllAssemblyMates({
    parts: input.parts,
    mates: input.mates,
    geometries: input.geometries,
  })
}
