import {
  BufferGeometry,
  Euler,
  Matrix4,
  Vector3,
  type EulerOrder,
} from 'three'
import { clearMeshTopologyCaches } from '../model-selection/facePlaneSelection'
import { replaceWithCreaseNormals } from '../../lib/geometryCreaseNormals'
import { getGeometryGeometricCenter } from './geometricCenter'

export type RotationDegrees = {
  x: number
  y: number
  z: number
}

export type RotateGeometryAroundCenterOptions = {
  order?: EulerOrder
}

const DEG_TO_RAD = Math.PI / 180
const scratchCenter = /* @__PURE__ */ new Vector3()
const scratchVertex = /* @__PURE__ */ new Vector3()
const scratchRotation = /* @__PURE__ */ new Matrix4()

/** Parsuje kąt w stopniach (przecinek dziesiętny dozwolony). */
export function parseRotationDegrees(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim()
  if (normalized === '') return 0
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n)) return null
  return n
}

/**
 * Obraca wierzchołki wokół środka geometrycznego (AABB).
 * Kolejność Euler: domyślnie XYZ.
 */
export function rotateGeometryAroundCenter(
  geometry: BufferGeometry,
  rotationDeg: RotationDegrees,
  options: RotateGeometryAroundCenterOptions = {},
): BufferGeometry {
  const order = options.order ?? 'XYZ'
  const center = getGeometryGeometricCenter(geometry, scratchCenter)
  const euler = new Euler(
    rotationDeg.x * DEG_TO_RAD,
    rotationDeg.y * DEG_TO_RAD,
    rotationDeg.z * DEG_TO_RAD,
    order,
  )
  scratchRotation.makeRotationFromEuler(euler)

  const position = geometry.getAttribute('position')
  if (!position) {
    return geometry
  }

  for (let i = 0; i < position.count; i++) {
    scratchVertex.fromBufferAttribute(position, i)
    scratchVertex.sub(center)
    scratchVertex.applyMatrix4(scratchRotation)
    scratchVertex.add(center)
    position.setXYZ(i, scratchVertex.x, scratchVertex.y, scratchVertex.z)
  }

  position.needsUpdate = true

  const withNormals = replaceWithCreaseNormals(geometry)
  withNormals.computeBoundingBox()
  withNormals.computeBoundingSphere()
  clearMeshTopologyCaches(withNormals)
  return withNormals
}
