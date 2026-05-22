import type { BufferGeometry } from 'three'
import { Vector3 } from 'three'
import { getGeometryGeometricCenter } from '../model-transform/geometricCenter'
import { isOrbitControlsLike } from '../view-navigation/viewCubeOrbitTween'
import { setOrbitFocusPointWorld } from './orbitFocusPointWorld'

/** Punkt obrotu widoku — środek geometryczny (AABB) siatki w mm. */
export function getModelOrbitFocusPoint(geometry: BufferGeometry, out = new Vector3()): Vector3 {
  return getGeometryGeometricCenter(geometry, out)
}

/** Ustawia target OrbitControls i globalny punkt obrotu na środek geometryczny modelu. */
export function syncOrbitFocusFromGeometry(
  controls: unknown,
  geometry: BufferGeometry,
): boolean {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) return false

  const center = getModelOrbitFocusPoint(geometry)
  setOrbitFocusPointWorld(center)

  if (!isOrbitControlsLike(controls)) return false
  controls.target.copy(center)
  controls.update()
  return true
}
