import type { PreAssemblyProgramPart } from '../preAssemblyProgram'

/** Etykieta detali w UI — ref pliku; przy powtórzeniu ref numer w nawiasie. */
export function buildProgramPartDisplayNameById(
  parts: readonly PreAssemblyProgramPart[],
): Record<string, string> {
  const refOccurrence = new Map<string, number>()
  const map: Record<string, string> = {}

  for (const part of parts) {
    const ref = part.ref.trim() || part.id
    const index = (refOccurrence.get(ref) ?? 0) + 1
    refOccurrence.set(ref, index)
    map[part.id] = index > 1 ? `${ref} (${index})` : ref
  }

  return map
}
