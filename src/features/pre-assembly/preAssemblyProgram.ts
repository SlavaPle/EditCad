import type { ProgramPartDescriptor } from './programParts/programPartFile'

export type PreAssemblyProgramPart = {
  id: string
  ref: string
  name: string
}

function createUniqueId(prefix: string): string {
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${stamp}-${rand}`
}

/** Dodaje detale programu z deskryptorów plików .ecdprt (każdy plik = osobny wpis). */
export function appendProgramParts(
  existing: readonly PreAssemblyProgramPart[],
  incoming: readonly ProgramPartDescriptor[],
): PreAssemblyProgramPart[] {
  if (incoming.length === 0) return [...existing]
  const added: PreAssemblyProgramPart[] = incoming.map((part) => ({
    id: createUniqueId('program-part'),
    ref: part.ref,
    name: part.name,
  }))
  return [...existing, ...added]
}

export function removeProgramPart(
  existing: readonly PreAssemblyProgramPart[],
  partId: string,
): PreAssemblyProgramPart[] {
  return existing.filter((part) => part.id !== partId)
}

export function programPartsFromAssemblyProgram(
  program: readonly PreAssemblyProgramPart[],
): PreAssemblyProgramPart[] {
  return program.map((part) => ({ ...part }))
}
