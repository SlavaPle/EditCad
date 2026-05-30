const DB_NAME = 'editcad-assembly-fs'
const STORE_NAME = 'directory-handles'
const DB_VERSION = 1

function assemblyRootKey(assemblyId: string): string {
  return `root:${assemblyId}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

/** Zapamiętuje katalog projektu dla danego id złożenia (permission może wygasnąć). */
export async function persistAssemblyRootHandle(
  assemblyId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, assemblyRootKey(assemblyId))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
  })
  db.close()
}

export async function restoreAssemblyRootHandle(
  assemblyId: string,
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb()
  const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(assemblyRootKey(assemblyId))
    req.onsuccess = () => {
      const value = req.result
      resolve(value && typeof value === 'object' && 'getFileHandle' in value ? value : null)
    }
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
  })
  db.close()
  if (!handle) return null
  try {
    const withPermission = handle as FileSystemDirectoryHandle & {
      queryPermission?: (descriptor: { mode: 'read' }) => Promise<PermissionState>
      requestPermission?: (descriptor: { mode: 'read' }) => Promise<PermissionState>
    }
    if (!withPermission.queryPermission) return handle
    const permission = await withPermission.queryPermission({ mode: 'read' })
    if (permission === 'granted') return handle
    const requested = await withPermission.requestPermission?.({ mode: 'read' })
    return requested === 'granted' ? handle : null
  } catch {
    return null
  }
}
