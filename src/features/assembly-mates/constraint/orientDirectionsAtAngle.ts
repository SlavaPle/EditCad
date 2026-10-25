import { Quaternion, Vector3 } from 'three'
import { quaternionAlignDirections } from './transformMath'

const scratchAxis = new Vector3()
const scratchHint = new Vector3()
const worldY = new Vector3(0, 1, 0)
const worldX = new Vector3(1, 0, 0)

/**
 * Stabilny wektor w płaszczyźnie ⊥ `reference` (do etykietowania rozwiązań 0/1).
 * Projekcja world-up — nie zależy od znaku osi r×from.
 */
function stableHintPerpendicularTo(reference: Vector3, out: Vector3): Vector3 {
  out.copy(worldY).addScaledVector(reference, -worldY.dot(reference))
  if (out.lengthSq() < 1e-12) {
    out.copy(worldX).addScaledVector(reference, -worldX.dot(reference))
  }
  return out.normalize()
}

/**
 * Obrót `from` → jeden z dwóch absolutnych kierunków pod kątem `angleRad` do `reference`.
 * `flipped=false` ⇒ rozwiązanie 0, `flipped=true` ⇒ rozwiązanie 1
 * (kolejność ustalana względem stabilnego hint — nie przełącznik względem bieżącej pozy).
 */
export function quaternionOrientDirections(
  from: Vector3,
  reference: Vector3,
  angleRad: number,
  flipped: boolean,
): Quaternion {
  const f = from.clone().normalize()
  const r = reference.clone().normalize()

  // Kąt 0°: 0 = +reference, 1 = −reference
  if (Math.abs(angleRad) < 1e-8) {
    const target = flipped ? r.clone().negate() : r.clone()
    return quaternionAlignDirections(f, target)
  }

  scratchAxis.crossVectors(r, f)
  if (scratchAxis.lengthSq() < 1e-12) {
    stableHintPerpendicularTo(r, scratchHint)
    scratchAxis.crossVectors(r, scratchHint)
  }
  scratchAxis.normalize()

  const tPlus = r.clone().applyAxisAngle(scratchAxis, angleRad)
  const tMinus = r.clone().applyAxisAngle(scratchAxis, -angleRad)

  // Absolutna etykieta 0/1 niezależna od znaku osi (r×f)
  stableHintPerpendicularTo(r, scratchHint)
  const plusIsZero = tPlus.dot(scratchHint) >= tMinus.dot(scratchHint)
  const target0 = plusIsZero ? tPlus : tMinus
  const target1 = plusIsZero ? tMinus : tPlus
  const target = flipped ? target1 : target0

  return quaternionAlignDirections(f, target)
}

/** Kąt (rad) między dwoma kierunkami, w [0, π]. */
export function angleBetweenDirections(a: Vector3, b: Vector3): number {
  const dot = Math.min(1, Math.max(-1, a.clone().normalize().dot(b.clone().normalize())))
  return Math.acos(dot)
}
