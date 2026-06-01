import type { BufferGeometry } from 'three'
import type { ModelAppearance } from '../../viewer-display/modelAppearance'
import { readProgramPartFromFileWithRoot, type ProgramPartDescriptor } from './programPartFile'
import { loadProgramPartGeometryFromFile } from './programPartGeometry'

export type ProgramPartPickEntry = {
  part: ProgramPartDescriptor
  geometry: BufferGeometry
  appearance: ModelAppearance
  sourceHandle?: FileSystemHandle | null
}

export type ProgramPartPickBatchResult = {
  picked: ProgramPartPickEntry[]
  errors: string[]
}

/** Wczytuje wybrane pliki .ecdprt (metadane + geometria + wygląd). */
export async function pickProgramPartsFromFiles(
  files: FileList | File[],
  assemblyFileDirectory: FileSystemDirectoryHandle | null,
  fileHandles?: Array<FileSystemHandle | null>,
): Promise<ProgramPartPickBatchResult> {
  const picked: ProgramPartPickEntry[] = []
  const errors: string[] = []
  const list = [...files]
  for (let i = 0; i < list.length; i++) {
    const file = list[i]
    const handle = fileHandles?.[i] ?? null
    const meta = await readProgramPartFromFileWithRoot(file, assemblyFileDirectory, handle)
    if (!meta.ok) {
      errors.push(`${file.name}: ${meta.error}`)
      continue
    }
    const geometry = await loadProgramPartGeometryFromFile(file)
    if (!geometry.ok) {
      errors.push(`${file.name}: ${geometry.error}`)
      continue
    }
    picked.push({
      part: meta.part,
      geometry: geometry.geometry,
      appearance: geometry.appearance,
      sourceHandle: handle,
    })
  }
  return { picked, errors }
}
