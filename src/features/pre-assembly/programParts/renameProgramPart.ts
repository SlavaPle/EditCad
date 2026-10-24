import type { PreAssemblyProgramPart } from '../preAssemblyProgram'

/**
 * Zmienia name wpisu w programie montażu (.ecdasm).
 * Nie dotyka plików .ecdprt — tylko etykieta instancji w programie.
 */
export function renameProgramPart(
  parts: readonly PreAssemblyProgramPart[],
  partId: string,
  name: string,
): PreAssemblyProgramPart[] {
  const trimmed = name.trim()
  let changed = false
  const next = parts.map((part) => {
    if (part.id !== partId) return part
    const fallback = part.ref.trim() || part.id
    const nextName = trimmed || fallback
    if (nextName === part.name) return part
    changed = true
    return { ...part, name: nextName }
  })
  return changed ? next : [...parts]
}
