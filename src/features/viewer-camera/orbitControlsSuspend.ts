import { isOrbitControlsLike, type OrbitControlsLike } from './orbitViewRotation'

let suspendDepth = 0
let savedEnabled = true

/** Czy zablokowano obrót/pan widoku (manipulacja obiektem w scenie). */
export function isSceneOrbitSuspended(): boolean {
  return suspendDepth > 0
}

/** Wyłącza OrbitControls — można wywołać wielokrotnie (licznik referencji). */
export function suspendSceneOrbit(controls: unknown): void {
  if (!isOrbitControlsLike(controls)) return
  if (suspendDepth === 0) {
    savedEnabled = controls.enabled !== false
    controls.enabled = false
  }
  suspendDepth += 1
}

/** Przywraca OrbitControls po ostatnim resume. */
export function resumeSceneOrbit(controls: unknown): void {
  if (!isOrbitControlsLike(controls)) return
  suspendDepth = Math.max(0, suspendDepth - 1)
  if (suspendDepth === 0) {
    ;(controls as OrbitControlsLike).enabled = savedEnabled
  }
}

/** Wymuszone wznowienie (np. odmontowanie warstwy manipulacji). */
export function forceResumeAllSceneOrbit(controls: unknown): void {
  if (!isOrbitControlsLike(controls)) return
  suspendDepth = 0
  ;(controls as OrbitControlsLike).enabled = savedEnabled
}

/** Reset licznika — tylko na potrzeby testów. */
export function resetSceneOrbitSuspendForTests(): void {
  suspendDepth = 0
  savedEnabled = true
}
