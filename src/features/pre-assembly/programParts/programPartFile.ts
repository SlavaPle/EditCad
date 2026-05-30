import { ECDPRT_EXTENSION } from '../../../lib/saveModel'
import { parsePreparedElementFile } from '../../../lib/preparedElementFormat'

export const PROGRAM_PART_FILE_ACCEPT = '.ecdprt,.ECDPRT'

export type ProgramPartDescriptor = {
  /** Id pliku programu — nazwa pliku .ecdprt w slocie fantomu. */
  ref: string
  name: string
}

export function isProgramPartFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(ECDPRT_EXTENSION)
}

/** Weryfikuje plik programu (.ecdprt) i zwraca ref + nazwę do drzewa programu. */
export async function readProgramPartFromFile(
  file: File,
): Promise<{ ok: true; part: ProgramPartDescriptor } | { ok: false; error: string }> {
  if (!isProgramPartFileName(file.name)) {
    return {
      ok: false,
      error: `Only ${ECDPRT_EXTENSION} program files are allowed.`,
    }
  }

  const text = await file.text()
  const parsed = parsePreparedElementFile(text)
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }

  return {
    ok: true,
    part: {
      ref: file.name,
      name: parsed.file.name?.trim() || stripEcdprtExtension(file.name),
    },
  }
}

function stripEcdprtExtension(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(ECDPRT_EXTENSION)) {
    return fileName.slice(0, -ECDPRT_EXTENSION.length)
  }
  return fileName
}
