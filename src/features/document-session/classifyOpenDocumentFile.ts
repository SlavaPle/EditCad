import { isSupportedExtension } from '../../lib/loadModel'
import { ECDASM_EXTENSION } from '../pre-assembly/assemblyFile/assemblyFileIo'

export type OpenDocumentFileKind = 'assembly' | 'model'

/** Rozpoznaje montaż (.ecdasm) vs detal / mesh wg rozszerzenia. */
export function classifyOpenDocumentFileName(fileName: string): OpenDocumentFileKind | null {
  const trimmed = fileName.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (lower.endsWith(ECDASM_EXTENSION)) {
    return 'assembly'
  }
  if (isSupportedExtension(trimmed)) {
    return 'model'
  }
  return null
}
