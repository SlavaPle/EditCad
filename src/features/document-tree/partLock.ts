/** Blokada pozycji detalu w sesji (bez persystencji .ecdasm). */

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
