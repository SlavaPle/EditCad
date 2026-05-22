import { Vector3 } from 'three'

/** Bieżący punkt obrotu widoku w układzie świata (mm) — ustawiany przez ModelOrbitFocusSync. */
export const orbitFocusPointWorld = /* @__PURE__ */ new Vector3()

export function copyOrbitFocusPointWorld(out: Vector3): Vector3 {
  return out.copy(orbitFocusPointWorld)
}

export function setOrbitFocusPointWorld(point: Vector3): void {
  orbitFocusPointWorld.copy(point)
}
