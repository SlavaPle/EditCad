import { ECDPRT_EXTENSION } from '../../../lib/saveModel'
import { isSupportedExtension, MODEL_FILE_ACCEPT } from '../../../lib/loadModel'
import { parsePreparedElementFile } from '../../../lib/preparedElementFormat'
import { computeRelativeRefFromRoot } from '../assemblyFile/assemblyRelativePath'

/** Te same rozszerzenia co Open modelu — detal programu może być .ecdprt albo mesh. */
export const PROGRAM_PART_FILE_ACCEPT = MODEL_FILE_ACCEPT

export type ProgramPartDescriptor = {
  /** Ścieżka / nazwa pliku w programie montażu (ref do geometrii). */
  ref: string
  name: string
}

export function isProgramPartFileName(fileName: string): boolean {
  return isSupportedExtension(fileName)
}

function isEcdprtFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(ECDPRT_EXTENSION)
}

function stripFileExtension(fileName: string): string {
  const i = fileName.lastIndexOf('.')
  if (i <= 0) return fileName
  return fileName.slice(0, i)
}

/** Weryfikuje plik modelu programu i zwraca ref + nazwę do drzewa. */
export async function readProgramPartFromFile(
  file: File,
): Promise<{ ok: true; part: ProgramPartDescriptor } | { ok: false; error: string }> {
  if (!isProgramPartFileName(file.name)) {
    return {
      ok: false,
      error: `Unsupported format: ${file.name}. Use .stl, .ecdprt, .stp, .step, .igs, or .iges.`,
    }
  }

  if (!isEcdprtFileName(file.name)) {
    return {
      ok: true,
      part: {
        ref: file.name,
        name: stripFileExtension(file.name),
      },
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
      name: parsed.file.name?.trim() || stripFileExtension(file.name),
    },
  }
}

/** ref = ścieżka względna w katalogu projektu złożenia, jeśli znany root. */
export async function readProgramPartFromFileWithRoot(
  file: File,
  projectRoot: FileSystemDirectoryHandle | null,
  fileHandle?: FileSystemHandle | null,
): Promise<{ ok: true; part: ProgramPartDescriptor } | { ok: false; error: string }> {
  const meta = await readProgramPartFromFile(file)
  if (!meta.ok) return meta
  if (projectRoot && fileHandle) {
    const relativeRef = await computeRelativeRefFromRoot(projectRoot, fileHandle)
    if (relativeRef) {
      return {
        ok: true,
        part: {
          ref: relativeRef,
          name: meta.part.name,
        },
      }
    }
  }
  return meta
}
