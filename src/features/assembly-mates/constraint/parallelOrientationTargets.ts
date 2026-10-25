import { Vector3 } from 'three'
import type { MateAlignment } from '../model'
import { lineOffsetAxis } from '../lineWorldFrame'

const worldY = new Vector3(0, 1, 0)
const worldX = new Vector3(1, 0, 0)

/** Kierunek w płaszczyźnie ⊥ `normal` (projekcja hinta). */
export function directionInPlane(planeNormal: Vector3, hint: Vector3): Vector3 {
  const n = planeNormal.clone().normalize()
  let dir = hint.clone().sub(n.clone().multiplyScalar(hint.dot(n)))
  if (dir.lengthSq() < 1e-12) {
    dir = lineOffsetAxis(n)
  }
  return dir.normalize()
}

/**
 * Absolutny cel równoległy: sameDirection → +reference, faceToFace → −reference.
 * (Flip UI: unchecked = faceToFace, checked = sameDirection.)
 */
export function parallelAlignedTarget(
  reference: Vector3,
  alignment: MateAlignment,
): Vector3 {
  const r = reference.clone().normalize()
  return alignment === 'sameDirection' ? r : r.clone().negate()
}

/**
 * Absolutny kierunek linii w płaszczyźnie (nie przełącznik względem bieżącego dir).
 * Dwa rozwiązania ±projected; etykieta 0/1 względem stabilnej osi w płaszczyźnie.
 */
export function absoluteInPlaneLineDirection(
  planeNormal: Vector3,
  currentDir: Vector3,
  alignment: MateAlignment,
): Vector3 {
  const n = planeNormal.clone().normalize()
  let projected = currentDir.clone().sub(n.clone().multiplyScalar(currentDir.dot(n)))
  if (projected.lengthSq() < 1e-12) {
    projected = directionInPlane(n, currentDir)
  } else {
    projected.normalize()
  }

  const primary = directionInPlane(n, worldY)
  const secondary = new Vector3().crossVectors(n, primary).normalize()

  const isZero = (d: Vector3) => {
    const alongPrimary = d.dot(primary)
    if (Math.abs(alongPrimary) > 1e-6) return alongPrimary >= 0
    return d.dot(secondary) >= 0
  }

  const d0 = isZero(projected) ? projected : projected.clone().negate()
  const d1 = d0.clone().negate()
  return alignment === 'sameDirection' ? d0 : d1
}

/**
 * Absolutna normalna płaszczyzny ∥ linii (normal ⊥ lineDir).
 * Rzut currentNormal na płaszczyznę ⊥ dir, potem etykieta ± jak 0/1.
 */
export function absoluteNormalParallelToLine(
  lineDir: Vector3,
  currentNormal: Vector3,
  alignment: MateAlignment,
): Vector3 {
  const dir = lineDir.clone().normalize()
  let projected = currentNormal.clone().sub(dir.clone().multiplyScalar(currentNormal.dot(dir)))
  if (projected.lengthSq() < 1e-12) {
    projected = lineOffsetAxis(dir)
  } else {
    projected.normalize()
  }

  const hint =
    Math.abs(dir.dot(worldY)) < 0.9
      ? new Vector3().crossVectors(dir, worldY).normalize()
      : new Vector3().crossVectors(dir, worldX).normalize()
  const secondary = new Vector3().crossVectors(dir, hint).normalize()

  const isZero = (d: Vector3) => {
    const along = d.dot(hint)
    if (Math.abs(along) > 1e-6) return along >= 0
    return d.dot(secondary) >= 0
  }

  const n0 = isZero(projected) ? projected : projected.clone().negate()
  const n1 = n0.clone().negate()
  return alignment === 'sameDirection' ? n0 : n1
}
