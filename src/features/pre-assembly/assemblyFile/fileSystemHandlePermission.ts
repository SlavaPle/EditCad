type HandleWithPermission = FileSystemHandle & {
  queryPermission?: (descriptor: { mode: 'read' }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: 'read' }) => Promise<PermissionState>
}

/** Przywraca odczyt zapisanego handle (IndexedDB) — bez tego getFile() po restarcie często pada. */
export async function ensureFileSystemHandleReadPermission(
  handle: FileSystemHandle,
): Promise<boolean> {
  const withPermission = handle as HandleWithPermission
  if (!withPermission.queryPermission) return true
  try {
    const permission = await withPermission.queryPermission({ mode: 'read' })
    if (permission === 'granted') return true
    const requested = await withPermission.requestPermission?.({ mode: 'read' })
    return requested === 'granted'
  } catch {
    return false
  }
}
