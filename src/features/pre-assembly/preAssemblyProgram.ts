import type { PhantomTransform } from './model'
import type { ProgramPartDescriptor } from './programParts/programPartFile'
import { defaultProgramPartTransform } from './programParts/programPartTransform'

export type PreAssemblyProgramPart = {
  id: string
  ref: string
  name: string
  transform: PhantomTransform
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
    transform: defaultProgramPartTransform(),
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
  return program.map((part) => ({
    ...part,
    transform: {
      positionMm: [...part.transform.positionMm] as PhantomTransform['positionMm'],
      rotationDeg: [...part.transform.rotationDeg] as PhantomTransform['rotationDeg'],
    },
  }))
}

export function updateProgramPartTransform(
  parts: readonly PreAssemblyProgramPart[],
  partId: string,
  transform: PhantomTransform,
): PreAssemblyProgramPart[] {
  return parts.map((part) =>
    part.id === partId
      ? {
          ...part,
          transform: {
            positionMm: [...transform.positionMm] as PhantomTransform['positionMm'],
            rotationDeg: [...transform.rotationDeg] as PhantomTransform['rotationDeg'],
          },
        }
      : part,
  )
}

/** Scala wsadowo wygenerowane detale (np. React Strict Mode — ten sam zestaw id). */
export function mergeProgramPartsBatch(
  current: readonly PreAssemblyProgramPart[],
  newParts: readonly PreAssemblyProgramPart[],
): PreAssemblyProgramPart[] {
  const alreadyAdded =
    newParts.length > 0 && newParts.every((part) => current.some((c) => c.id === part.id))
  if (alreadyAdded) return [...current]
  return [
    ...current,
    ...newParts.filter((part) => !current.some((c) => c.id === part.id)),
  ]
}

export function assignProgramPartLayoutPositions(
  parts: readonly PreAssemblyProgramPart[],
  positionsMm: Readonly<Record<string, [number, number, number]>>,
): PreAssemblyProgramPart[] {
  return parts.map((part) => {
    const layout = positionsMm[part.id]
    if (!layout) return part
    const atOrigin =
      part.transform.positionMm[0] === 0 &&
      part.transform.positionMm[1] === 0 &&
      part.transform.positionMm[2] === 0
    if (!atOrigin) return part
    return {
      ...part,
      transform: {
        ...part.transform,
        positionMm: [...layout] as PhantomTransform['positionMm'],
      },
    }
  })
}
