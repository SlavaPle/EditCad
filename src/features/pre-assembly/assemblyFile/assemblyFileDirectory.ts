import { restoreAssemblyRootHandle } from './assemblyRootStore'

/**
 * Katalog zawierający plik .ecdasm (ścieżki ref w JSON są względem tego katalogu).
 */
export async function getAssemblyFileDirectoryHandle(
  assemblyId: string,
): Promise<FileSystemDirectoryHandle | null> {
  return restoreAssemblyRootHandle(assemblyId)
}

export async function rememberAssemblyFileDirectory(
  assemblyId: string,
  directory: FileSystemDirectoryHandle,
): Promise<void> {
  const { persistAssemblyRootHandle } = await import('./assemblyRootStore')
  await persistAssemblyRootHandle(assemblyId, directory)
}
