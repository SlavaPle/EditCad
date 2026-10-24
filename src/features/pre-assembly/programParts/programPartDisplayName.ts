import type { PreAssemblyProgramPart } from '../preAssemblyProgram'

/**
 * Etykieta detalu w UI montażu — `name` z programu (.ecdasm);
 * przy powtórzeniu tej samej etykiety numer w nawiasie.
 * Ref pliku .ecdprt zostaje bez zmian (ścieżka do geometrii).
 */
export function buildProgramPartDisplayNameById(
  parts: readonly PreAssemblyProgramPart[],
): Record<string, string> {
  const labelOccurrence = new Map<string, number>()
  const map: Record<string, string> = {}

  for (const part of parts) {
    const label = part.name.trim() || part.ref.trim() || part.id
    const index = (labelOccurrence.get(label) ?? 0) + 1
    labelOccurrence.set(label, index)
    map[part.id] = index > 1 ? `${label} (${index})` : label
  }

  return map
}
