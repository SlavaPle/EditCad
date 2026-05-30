/** Ścieżka względna w obrębie katalogu projektu złożenia (tylko `/`). */
export function normalizeAssemblyRelativeRef(ref: string): string {
  return ref.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
}

export function splitAssemblyRelativeRef(ref: string): string[] {
  return normalizeAssemblyRelativeRef(ref).split('/').filter(Boolean)
}

export function programPartRefBaseName(ref: string): string {
  const segments = splitAssemblyRelativeRef(ref)
  return segments[segments.length - 1] ?? ref
}

/**
 * Odczyt pliku detalu po ref zapisanym w .ecdasm (np. parts/panel.ecdprt).
 */
export async function getFileFromAssemblyRoot(
  root: FileSystemDirectoryHandle,
  relativeRef: string,
): Promise<File> {
  const segments = splitAssemblyRelativeRef(relativeRef)
  if (segments.length === 0) {
    throw new Error('Empty program part path.')
  }
  let dir = root
  for (let i = 0; i < segments.length - 1; i++) {
    dir = await dir.getDirectoryHandle(segments[i])
  }
  const fileHandle = await dir.getFileHandle(segments[segments.length - 1])
  return fileHandle.getFile()
}

/**
 * Ref względem katalogu projektu (resolve w File System Access API).
 */
export async function computeRelativeRefFromRoot(
  root: FileSystemDirectoryHandle,
  fileHandle: FileSystemHandle,
): Promise<string | null> {
  const resolve = (
    root as FileSystemDirectoryHandle & {
      resolve?: (possibleDescendant: FileSystemHandle) => Promise<string[] | null>
    }
  ).resolve
  if (!resolve) {
    return fileHandle.name ?? null
  }
  const segments = await resolve.call(root, fileHandle)
  if (!segments || segments.length === 0) return null
  return normalizeAssemblyRelativeRef(segments.join('/'))
}
