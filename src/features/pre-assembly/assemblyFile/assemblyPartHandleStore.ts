const DB_NAME = 'editcad-assembly-part-handles'
const STORE_NAME = 'handles'
const DB_VERSION = 1

function partHandleKey(assemblyId: string, ref: string): string {
  return `${assemblyId}::${ref}`
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

export async function persistPartFileHandle(
  assemblyId: string,
  ref: string,
  handle: FileSystemHandle,
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, partHandleKey(assemblyId, ref))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
  })
  db.close()
}

export async function restorePartFileHandle(
  assemblyId: string,
  ref: string,
): Promise<FileSystemHandle | null> {
  const db = await openDb()
  const handle = await new Promise<FileSystemHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(partHandleKey(assemblyId, ref))
    req.onsuccess = () => {
      const value = req.result
      resolve(value && typeof value === 'object' && 'getFile' in value ? value : null)
    }
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
  })
  db.close()
  return handle
}

export async function removePartFileHandle(assemblyId: string, ref: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(partHandleKey(assemblyId, ref))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'))
  })
  db.close()
}

export async function clearPartFileHandlesForAssembly(assemblyId: string): Promise<void> {
  const db = await openDb()
  const prefix = `${assemblyId}::`
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openKeyCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
        store.delete(cursor.key)
      }
      cursor.continue()
    }
    request.onerror = () => reject(request.error ?? new Error('IndexedDB cursor failed'))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'))
  })
  db.close()
}
