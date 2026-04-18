/**
 * Normalne z progiem załamania (jak grupy wygładzania w CAD): płaskie płyty bez widocznej przekątnej triangulacji.
 */
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { BufferGeometry } from 'three'

/** Poniżej tego kąta między ścianami normalne są uśredniane (np. dwa trójkąty jednej płaszczyzny). */
const CREASE_ANGLE_RAD = Math.PI / 4

/**
 * Dla geometrii z indeksem Three.js może zwrócić nową geometrię non-indexed — wtedy wejściowa jest zwalniana.
 */
export function replaceWithCreaseNormals(geometry: BufferGeometry): BufferGeometry {
  const next = toCreasedNormals(geometry, CREASE_ANGLE_RAD)
  if (next !== geometry) {
    geometry.dispose()
  }
  return next
}
