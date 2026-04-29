/** Normalne z progiem załamania (toCreasedNormals); indeksowana geometria może stać się non-indexed. */
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { BufferGeometry } from 'three'

const CREASE_ANGLE_RAD = Math.PI / 4

export function replaceWithCreaseNormals(geometry: BufferGeometry): BufferGeometry {
  const next = toCreasedNormals(geometry, CREASE_ANGLE_RAD)
  if (next !== geometry) {
    geometry.dispose()
  }
  return next
}
