import type { BufferGeometry } from 'three'
import type { ModelAppearance } from '../../viewer-display/modelAppearance'
import { getFileFromAssemblyRoot } from '../assemblyFile/assemblyRelativePath'
import { restorePartFileHandle } from '../assemblyFile/assemblyPartHandleStore'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { loadProgramPartGeometryFromFile } from './programPartGeometry'

export type LoadAssemblyGeometriesResult = {
  geometries: Record<string, BufferGeometry>
  appearances: Record<string, ModelAppearance>
  loadedCount: number
  missingRefs: string[]
  errors: string[]
}

async function loadPartGeometry(
  assemblyId: string,
  part: PreAssemblyProgramPart,
  directory: FileSystemDirectoryHandle | null,
): Promise<
  | { ok: true; geometry: BufferGeometry; appearance: ModelAppearance }
  | { ok: false; error: string }
> {
  const storedHandle = await restorePartFileHandle(assemblyId, part.ref)
  if (storedHandle && 'getFile' in storedHandle) {
    try {
      const file = await (storedHandle as FileSystemFileHandle).getFile()
      return loadProgramPartGeometryFromFile(file)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  if (!directory) {
    return { ok: false, error: 'No file access for this part.' }
  }

  try {
    const file = await getFileFromAssemblyRoot(directory, part.ref)
    return loadProgramPartGeometryFromFile(file)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

/**
 * Ładuje geometrię detali: najpierw zapisany handle (IndexedDB), potem ścieżka względna do .ecdasm.
 */
export async function loadGeometriesFromAssembly(
  assemblyId: string,
  parts: readonly PreAssemblyProgramPart[],
  directory: FileSystemDirectoryHandle | null,
): Promise<LoadAssemblyGeometriesResult> {
  const geometries: Record<string, BufferGeometry> = {}
  const appearances: Record<string, ModelAppearance> = {}
  const errors: string[] = []
  const missingRefs: string[] = []
  let loadedCount = 0

  for (const part of parts) {
    const result = await loadPartGeometry(assemblyId, part, directory)
    if (result.ok) {
      geometries[part.id] = result.geometry
      appearances[part.id] = result.appearance
      loadedCount += 1
    } else {
      errors.push(`${part.ref}: ${result.error}`)
      missingRefs.push(part.ref)
    }
  }

  return { geometries, appearances, loadedCount, missingRefs, errors }
}
