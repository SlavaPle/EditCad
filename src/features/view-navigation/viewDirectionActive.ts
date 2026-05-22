import { Vector3 } from 'three'

const scratchOffset = /* @__PURE__ */ new Vector3()
const scratchDir = /* @__PURE__ */ new Vector3()

/** Czy kamera już patrzy wzdłuż żądanego kierunku widoku (do ponownego fit). */
export function isViewDirectionActive(
  camera: { position: Vector3 },
  focusPoint: Vector3,
  direction: Vector3,
  threshold = 0.98,
): boolean {
  scratchOffset.copy(camera.position).sub(focusPoint)
  if (scratchOffset.lengthSq() < 1e-8) return false
  scratchDir.copy(direction).normalize()
  return scratchOffset.normalize().dot(scratchDir) >= threshold
}
