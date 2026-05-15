import { BufferGeometry, Vector3 } from 'three'

const _size = new Vector3()

export interface TriplanarMappingUniforms {
  origin: Vector3
  invSize: Vector3
}

/** Parametry mapowania triplanar w układzie obiektu (0…1 w obrębie bbox). */
export function computeTriplanarMappingUniforms(geometry: BufferGeometry): TriplanarMappingUniforms {
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) {
    return { origin: new Vector3(), invSize: new Vector3(1, 1, 1) }
  }

  box.getSize(_size)
  return {
    origin: box.min.clone(),
    invSize: new Vector3(
      1 / Math.max(_size.x, 1e-8),
      1 / Math.max(_size.y, 1e-8),
      1 / Math.max(_size.z, 1e-8),
    ),
  }
}
