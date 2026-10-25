/** Blokada pozycji detalu — w sesji i w pliku .ecdasm (`lockedPartIds`). */

export type PartLockMap = Readonly<Record<string, boolean>>

export function isPartLocked(locks: PartLockMap, partId: string): boolean {
  return locks[partId] === true
}

export function togglePartLock(locks: PartLockMap, partId: string): Record<string, boolean> {
  const next = { ...locks }
  if (next[partId]) {
    delete next[partId]
  } else {
    next[partId] = true
  }
  return next
}

export function setPartLock(
  locks: PartLockMap,
  partId: string,
  locked: boolean,
): Record<string, boolean> {
  const next = { ...locks }
  if (locked) {
    next[partId] = true
  } else {
    delete next[partId]
  }
  return next
}

/** Usuwa wpisy lock dla detali, których już nie ma w programie. */
export function filterPartLocksForPartIds(
  locks: PartLockMap,
  partIds: ReadonlySet<string>,
): Record<string, boolean> {
  const next: Record<string, boolean> = {}
  for (const [id, locked] of Object.entries(locks)) {
    if (locked && partIds.has(id)) {
      next[id] = true
    }
  }
  return next
}

/** Zbiór id zablokowanych detali (do solvera mates / drag). */
export function lockedPartIdSet(locks: PartLockMap): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const [id, locked] of Object.entries(locks)) {
    if (locked) ids.add(id)
  }
  return ids
}

/** Id do zapisu w .ecdasm — posortowane dla stabilnego JSON. */
export function lockedPartIdsFromMap(locks: PartLockMap): string[] {
  return [...lockedPartIdSet(locks)].sort()
}

/** Mapa z listy id (np. po odczycie .ecdasm). */
export function partLockMapFromIds(
  ids: readonly string[] | null | undefined,
): Record<string, boolean> {
  if (!ids || ids.length === 0) return {}
  const next: Record<string, boolean> = {}
  for (const id of ids) {
    if (typeof id === 'string' && id.trim().length > 0) {
      next[id.trim()] = true
    }
  }
  return next
}
