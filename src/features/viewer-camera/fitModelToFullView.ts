import {
  Box3,
  BufferAttribute,
  PerspectiveCamera,
  Vector3,
  type BufferGeometry,
  type Camera,
} from 'three'
import { getGeometryGeometricCenter } from '../model-transform/geometricCenter'
import { isOrbitControlsLike, syncOrbitViewFocus } from './orbitViewRotation'
import { setOrbitFocusPointWorld } from './orbitFocusPointWorld'

const scratchBox = /* @__PURE__ */ new Box3()
const scratchSize = /* @__PURE__ */ new Vector3()
const scratchDir = /* @__PURE__ */ new Vector3()

export function getGeometryWorldBox(geometry: BufferGeometry, out = scratchBox): Box3 | null {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) return null
  return out.setFromBufferAttribute(position as BufferAttribute)
}

/** Odległość kamery od środka, aby AABB zmieścił się w kadrze (perspektywa). */
export function computeFitDistanceForBox(
  box: Box3,
  camera: PerspectiveCamera,
  margin: number,
): number {
  const size = box.getSize(scratchSize)
  const maxSize = Math.max(size.x, size.y, size.z)
  if (maxSize < 1e-8) return 10
  const vFov = (camera.fov * Math.PI) / 180
  const fitHeightDistance = maxSize / (2 * Math.tan(vFov / 2))
  const fitWidthDistance = fitHeightDistance / camera.aspect
  return margin * Math.max(fitHeightDistance, fitWidthDistance)
}

export type FitModelToFullViewOptions = {
  margin?: number
  /** Kierunek od środka do kamery; domyślnie bieżący widok lub [1,1,1]. */
  viewDirection?: Vector3
}

/**
 * Pokazuje detal na pełnym ekranie: kamera i target OrbitControls na środek AABB wierzchołków.
 */
export function fitModelToFullView(
  geometry: BufferGeometry,
  camera: Camera,
  controls: unknown,
  options: FitModelToFullViewOptions = {},
): boolean {
  const box = getGeometryWorldBox(geometry)
  if (!box) return false

  const persp = camera as PerspectiveCamera
  if (!persp.isPerspectiveCamera) return false

  const margin = options.margin ?? 1.05
  const center = getGeometryGeometricCenter(geometry)
  setOrbitFocusPointWorld(center)

  const distance = computeFitDistanceForBox(box, persp, margin)

  let dir = options.viewDirection
  if (!dir) {
    const orbitTarget = isOrbitControlsLike(controls) ? controls.target : center
    scratchDir.copy(persp.position).sub(orbitTarget)
    if (scratchDir.lengthSq() < 1e-8) {
      scratchDir.set(1, 1, 1)
    }
    dir = scratchDir.normalize()
  } else {
    scratchDir.copy(dir).normalize()
    dir = scratchDir
  }

  persp.position.copy(center).addScaledVector(dir, distance)
  persp.lookAt(center)
  persp.near = Math.max(distance / 200, 0.01)
  persp.far = Math.max(distance * 200, persp.near + 1)
  persp.updateProjectionMatrix()

  syncOrbitViewFocus(controls, center)
  return true
}
