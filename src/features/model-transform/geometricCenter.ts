import { Box3, BufferAttribute, Vector3, type BufferGeometry } from 'three'

const scratchBox = /* @__PURE__ */ new Box3()
const scratchCenter = /* @__PURE__ */ new Vector3()

/** Środek geometryczny siatki — środek osiowego AABB wierzchołków (mm), zawsze z bieżących pozycji. */
export function getGeometryGeometricCenter(geometry: BufferGeometry, target = scratchCenter): Vector3 {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) {
    return target.set(0, 0, 0)
  }

  scratchBox.setFromBufferAttribute(position as BufferAttribute)
  if (scratchBox.isEmpty()) {
    return target.set(0, 0, 0)
  }

  return scratchBox.getCenter(target)
}
