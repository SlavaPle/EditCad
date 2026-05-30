/** Użytkownik zamknął okno wyboru pliku (File System Access API). */
export function isUserCancelError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
