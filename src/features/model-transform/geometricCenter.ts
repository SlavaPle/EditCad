import { Box3, Vector3, type BufferGeometry } from 'three'

const scratchBox = /* @__PURE__ */ new Box3()
const scratchCenter = /* @__PURE__ */ new Vector3()

/** Środek geometryczny siatki — środek osiowego AABB (mm). */
export function getGeometryGeometricCenter(geometry: BufferGeometry, target = scratchCenter): Vector3 {
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox()
  }
  const box = geometry.boundingBox ?? scratchBox.set(
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
  )
  return box.getCenter(target)
}
