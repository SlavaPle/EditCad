import type { PreAssemblyProgramPart } from '../preAssemblyProgram'

/** Etykieta detali w UI — przy powtarzających się name dodaje ref (jak w panelu programu). */
export function buildProgramPartDisplayNameById(
  parts: readonly PreAssemblyProgramPart[],
): Record<string, string> {
  const nameCounts = new Map<string, number>()
  for (const part of parts) {
    const label = part.name.trim() || part.ref
    nameCounts.set(label, (nameCounts.get(label) ?? 0) + 1)
  }

  const map: Record<string, string> = {}
  for (const part of parts) {
    const name = part.name.trim() || part.ref
    map[part.id] =
      (nameCounts.get(name) ?? 0) > 1 ? `${name} · ${part.ref}` : name
  }
  return map
}
