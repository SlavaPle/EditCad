import type { BrowserFileHandle } from '../../../lib/saveModel'
import { pickAssemblyProjectDirectory } from './assemblyProjectIo'
import { persistAssemblyRootHandle, restoreAssemblyRootHandle } from './assemblyRootStore'

type AssemblySourceHandle = FileSystemHandle | BrowserFileHandle

type HandleWithParent = AssemblySourceHandle & {
  getParent?: () => Promise<FileSystemDirectoryHandle | null>
}

/** Katalog nadrzędny pliku .ecdasm — gdy przeglądarka udostępnia getParent(). */
export async function resolveAssemblyRootFromFileHandle(
  fileHandle: AssemblySourceHandle | null | undefined,
): Promise<FileSystemDirectoryHandle | null> {
  if (!fileHandle) return null
  const withParent = fileHandle as HandleWithParent
  if (!withParent.getParent) return null
  try {
    return await withParent.getParent()
  } catch {
    return null
  }
}

export type ResolveAssemblyProjectDirectoryOptions = {
  assemblyId: string
  currentRoot: FileSystemDirectoryHandle | null
  assemblySourceHandle?: AssemblySourceHandle | null
  promptIfMissing?: boolean
  startInForPrompt?: AssemblySourceHandle | null
}

/**
 * Katalog projektu: stan → IndexedDB → rodzic pliku .ecdasm → opcjonalnie dialog folderu.
 */
export async function resolveAssemblyProjectDirectory(
  options: ResolveAssemblyProjectDirectoryOptions,
): Promise<FileSystemDirectoryHandle | null> {
  const {
    assemblyId,
    currentRoot,
    assemblySourceHandle,
    promptIfMissing = false,
    startInForPrompt,
  } = options

  if (currentRoot) {
    await persistAssemblyRootHandle(assemblyId, currentRoot)
    return currentRoot
  }

  const stored = await restoreAssemblyRootHandle(assemblyId)
  if (stored) {
    await persistAssemblyRootHandle(assemblyId, stored)
    return stored
  }

  const fromSource = await resolveAssemblyRootFromFileHandle(assemblySourceHandle)
  if (fromSource) {
    await persistAssemblyRootHandle(assemblyId, fromSource)
    return fromSource
  }

  if (!promptIfMissing) return null

  const picked = await pickAssemblyProjectDirectory(
    (startInForPrompt ?? assemblySourceHandle ?? undefined) as FileSystemHandle | undefined,
  )
  if (picked) {
    await persistAssemblyRootHandle(assemblyId, picked)
  }
  return picked
}
